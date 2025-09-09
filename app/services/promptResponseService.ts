import { API_BASE_URL } from '@env';
import apiService from './apiService';
import authService from './authService';
import { CreatePromptResponseData, FeedbackData, GetResponsesParams, PromptResponse, UpdatePromptResponseData } from './promptService';

// Use the same fallback as apiService
const BASE_URL = API_BASE_URL || "https://growing-together-app.onrender.com/api";

// React Native file type
interface ReactNativeFile {
  uri: string;
  type?: string;
  name?: string;
}

// Helper function to map API response to PromptResponse interface
function mapPromptResponseFromApi(apiResponse: any): PromptResponse {
  // Extract content from different possible structures
  let content = '';
  
  // Priority 1: Check if response has a 'response' field with content
  if (apiResponse.response && typeof apiResponse.response === 'object' && apiResponse.response.content) {
    content = apiResponse.response.content;
  }
  // Priority 2: Check if response has direct 'content' field
  else if (apiResponse.content) {
    content = apiResponse.content;
  }
  // Priority 3: Use response as string if it's a string
  else if (typeof apiResponse === 'string') {
    content = apiResponse;
  }
  
  // Extract promptId from different possible structures
  let promptId = '';
  if (apiResponse.promptId) {
    promptId = typeof apiResponse.promptId === 'string' ? apiResponse.promptId : apiResponse.promptId._id || apiResponse.promptId.id || '';
  } else if (apiResponse.prompt) {
    promptId = typeof apiResponse.prompt === 'string' ? apiResponse.prompt : apiResponse.prompt._id || apiResponse.prompt.id || '';
  }
  
  // Extract childId from different possible structures
  let childId = '';
  if (apiResponse.childId) {
    childId = typeof apiResponse.childId === 'string' ? apiResponse.childId : apiResponse.childId._id || apiResponse.childId.id || '';
  } else if (apiResponse.child) {
    childId = typeof apiResponse.child === 'string' ? apiResponse.child : apiResponse.child._id || apiResponse.child.id || '';
  }
  
  // Map attachments
  const mappedAttachments = apiResponse.attachments?.map((att: any) => ({
    id: att._id || att.id || '',
    publicId: att.publicId || '',
    url: att.url || '',
    type: att.type || 'image',
    filename: att.filename || '',
    size: att.size || 0,
    createdAt: att.createdAt || '',
  })) || [];
  

  return {
    id: apiResponse.id || apiResponse._id || '',
    promptId: promptId,
    childId: childId,
    parentId: apiResponse.authorId || apiResponse.parentId, // Use authorId if available, fallback to parentId
    content: content,
    attachments: mappedAttachments,
    visibility: apiResponse.visibility || 'private',
    feedback: apiResponse.feedback,
    createdAt: apiResponse.createdAt || '',
    updatedAt: apiResponse.updatedAt || '',
  };
}

// API functions
export async function getChildResponses(params: GetResponsesParams): Promise<{ responses: PromptResponse[]; total: number; page: number; limit: number }> {
  try {
    // Log the request for debugging
    
    // Use the correct endpoint: /responses/child/:childId
    const response = await apiService.get(`/responses/child/${params.childId}`, {
      params: {
        page: params.page,
        limit: params.limit,
        promptId: params.promptId
      }
    });

    // Log successful response for debugging

    // Handle different response structures
    let responses: PromptResponse[] = [];
    let total = 0;
    let page = params.page || 1;
    let limit = params.limit || 10;

    const responseData = response as any;

    if (Array.isArray(responseData)) {
      // Direct array of responses
      responses = responseData.map(mapPromptResponseFromApi);
      total = responseData.length;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      // Response with data array
      responses = responseData.data.map(mapPromptResponseFromApi);
      total = responseData.total || responseData.data.length;
      page = responseData.page || page;
      limit = responseData.limit || limit;
    } else if (responseData.responses && Array.isArray(responseData.responses)) {
      // Response with responses property
      responses = responseData.responses.map(mapPromptResponseFromApi);
      total = responseData.total || responseData.responses.length;
      page = responseData.page || page;
      limit = responseData.limit || limit;
    } else if (responseData.data && responseData.data.responses && Array.isArray(responseData.data.responses)) {
      // Response with data.responses structure (your backend format)
      responses = responseData.data.responses.map(mapPromptResponseFromApi);
      total = responseData.data.totalResponses || responseData.data.responses.length;
      page = responseData.data.currentPage || page;
      limit = params.limit || limit;
    } else {
      console.error('promptResponseService: Unexpected response structure');
      throw new Error('Invalid response structure from server');
    }
    
    return {
      responses,
      total,
      page,
      limit
    };
    
  } catch (error: any) {
    console.error('promptResponseService: Failed to get child responses:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      response: error.response?.data
    });
    
    // Check if it's a permission error and provide more helpful message
    if (error.status === 403) {
      console.error('promptResponseService: Permission denied');
      console.error('promptResponseService: This might be because:');
      console.error('1. The child is not added to your family group');
      console.error('2. You don\'t have permission to view this child\'s responses');
      console.error('3. The family group permissions are not properly set up');
      console.error('4. Backend needs to be updated to check family group membership');
    }
    
    // Fallback to empty response
    return {
      responses: [],
      total: 0,
      page: 1,
      limit: params.limit || 10,
    };
  }
}

export async function createResponse(data: CreatePromptResponseData): Promise<PromptResponse> {
  // Validate required fields
  if (!data.promptId || !data.childId || !data.content) {
    const error = 'Missing required fields: promptId, childId, or content';
    console.error('promptResponseService: Validation error:', error);
    throw new Error(error);
  }

  // Create FormData for file uploads
  const formData = new FormData();
  
  // Add text fields
  formData.append('promptId', data.promptId);
  formData.append('child', data.childId); // Use 'child' as that's what the backend expects
  formData.append('response', JSON.stringify({ 
    type: 'text',
    content: data.content 
  }));
  
  // Add attachments if any
  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach((file, index) => {
      // Handle both File objects and React Native file objects
      if (file instanceof File) {
        // Web File object
        
        // Validate file type against backend requirements
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 
          'video/mp4', 'video/quicktime', 
          'audio/mpeg', 'audio/wav'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          console.warn('promptResponseService: Skipping web file with unsupported type:', file.type, file.name);
          return; // Skip this file
        }
        
        formData.append('attachments', file);
      } else {
        // React Native file object
        const fileObj = file as unknown as ReactNativeFile;
        const fileType = fileObj.type || 'image/jpeg';
        const fileName = fileObj.name || `attachment_${index}.jpg`;
        
        // Validate file type against backend requirements
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 
          'video/mp4', 'video/quicktime', 
          'audio/mpeg', 'audio/wav'
        ];
        
        if (!allowedTypes.includes(fileType)) {
          console.warn('promptResponseService: Skipping React Native file with unsupported type:', fileType, fileName);
          return; // Skip this file
        }
        
        formData.append('attachments', {
          uri: fileObj.uri,
          type: fileType,
          name: fileName,
        } as any);
      }
    });
  }

  // Use fetch for multipart/form-data
  const token = await authService.getAccessToken();
  
  const url = `${BASE_URL}/responses`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to create response';
    let errorData: any = {};
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } catch (parseError) {
      // If JSON parsing fails, use status text
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error('promptResponseService: Failed to parse error response:', parseError);
    }
    
    console.error('promptResponseService: Create response error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorMessage
    });
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  const responseData = result.data || result;
  const mappedResponse = mapPromptResponseFromApi(responseData);
  
  return mappedResponse;
}

export async function updateResponse(responseId: string, data: UpdatePromptResponseData): Promise<PromptResponse> {
  // Create FormData for text content only
  const formData = new FormData();
  
  // Add text fields - send content directly
  if (data.content) {
    // Send as JSON field that backend expects with type
    formData.append('response', JSON.stringify({ 
      content: data.content,
      type: 'text'
    }));
  }

  // Add visibility field
  if (data.visibility) {
    formData.append('visibility', data.visibility);
  }

  // Use fetch for multipart/form-data
  const token = await authService.getAccessToken();
  
  const url = `${BASE_URL}/responses/${responseId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to update response';
    let errorData: any = {};
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } catch (parseError) {
      // If JSON parsing fails, use status text
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error('promptResponseService: Failed to parse error response:', parseError);
    }
    
    console.error('promptResponseService: Update response error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorMessage
    });
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  // Handle the backend response structure: { data: { promptResponse: ... } }
  let responseData;
  if (result.data && result.data.promptResponse) {
    responseData = result.data.promptResponse;
  } else if (result.promptResponse) {
    responseData = result.promptResponse;
  } else {
    responseData = result.data || result;
  }
  
  const mappedResponse = mapPromptResponseFromApi(responseData);
  
  return mappedResponse;
}

export async function addFeedback(responseId: string, feedback: FeedbackData): Promise<PromptResponse> {
  // Note: This endpoint might need to be updated based on your backend structure
  // You might need to pass promptId as well
  const response = await apiService.post(`/responses/${responseId}/feedback`, feedback);
  const responseData = response.data || response;
  return mapPromptResponseFromApi(responseData);
}

export async function deleteResponse(responseId: string): Promise<void> {
  try {
    await apiService.delete(`/responses/${responseId}`);
  } catch (error: any) {
    console.error('promptResponseService: Error deleting response:', error);
    console.error('promptResponseService: Error response:', error.response);
    console.error('promptResponseService: Error data:', error.response?.data);
    throw error;
  }
}

// Attachment management functions
export async function addAttachments(responseId: string, files: File[]): Promise<PromptResponse> {
  const formData = new FormData();
  formData.append('action', 'add');
  
  let validFilesCount = 0;
  
  // Add files
  files.forEach((file, index) => {
    
    if (file instanceof File) {
      
      // Validate file size
      if (file.size === 0) {
        console.warn('promptResponseService: Skipping empty web file:', file.name);
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 
        'video/mp4', 'video/quicktime', 
        'audio/mpeg', 'audio/wav'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        console.warn('promptResponseService: Skipping file with unsupported type:', file.type, file.name);
        return;
      }
      
      formData.append('attachments', file);
      validFilesCount++;
    } else {
      // React Native file object
      const fileObj = file as unknown as ReactNativeFile;
      const fileType = fileObj.type || 'image/jpeg';
      const fileName = fileObj.name || `attachment_${index}.jpg`;
      
      if (!fileObj.uri || fileObj.uri.trim() === '') {
        console.warn('promptResponseService: Skipping React Native file with empty URI:', fileName);
        return;
      }
      
      // Get file size for React Native files
      const getFileSize = async (uri: string): Promise<number> => {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          return blob.size;
        } catch (error) {
          console.error('Error getting file size:', error);
          return 0;
        }
      };
      
      // Check file size before uploading
      getFileSize(fileObj.uri).then(fileSize => {
        
        if (fileSize > 10 * 1024 * 1024) { // 10MB limit
          console.warn('promptResponseService: File too large:', fileSize, 'bytes');
        }
      });
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 
        'video/mp4', 'video/quicktime', 
        'audio/mpeg', 'audio/wav'
      ];
      
      if (!allowedTypes.includes(fileType)) {
        console.warn('promptResponseService: Skipping file with unsupported type:', fileType, fileName);
        return;
      }
      
      formData.append('attachments', {
        uri: fileObj.uri,
        type: fileType,
        name: fileName,
      } as any);
      validFilesCount++;
    }
  });
  
  if (validFilesCount === 0) {
    throw new Error('No valid files to upload');
  }

  const token = await authService.getAccessToken();
  const url = `${BASE_URL}/responses/${responseId}/attachments`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to add attachments';
    let errorData: any = {};
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } catch (parseError) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error('promptResponseService: Failed to parse error response:', parseError);
    }
    
    console.error('promptResponseService: Add attachments error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorMessage
    });
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  // Handle the backend response structure
  let responseData;
  if (result.data && result.data.promptResponse) {
    responseData = result.data.promptResponse;
  } else if (result.promptResponse) {
    responseData = result.promptResponse;
  } else {
    responseData = result.data || result;
  }
  
  return mapPromptResponseFromApi(responseData);
}

export async function removeAttachments(responseId: string, attachmentIds: string[]): Promise<PromptResponse> {
  const token = await authService.getAccessToken();
  const url = `${BASE_URL}/responses/${responseId}/attachments`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'remove',
      attachmentIds: attachmentIds
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to remove attachments';
    let errorData: any = {};
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } catch (parseError) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error('promptResponseService: Failed to parse error response:', parseError);
    }
    
    console.error('promptResponseService: Remove attachments error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorMessage
    });
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  // Handle the backend response structure
  let responseData;
  if (result.data && result.data.promptResponse) {
    responseData = result.data.promptResponse;
  } else if (result.promptResponse) {
    responseData = result.promptResponse;
  } else {
    responseData = result.data || result;
  }
  
  return mapPromptResponseFromApi(responseData);
}

export async function replaceAttachments(responseId: string, files: File[]): Promise<PromptResponse> {
  const formData = new FormData();
  formData.append('action', 'replace');
  
  // Add files
  files.forEach((file, index) => {
    if (file instanceof File) {
      
      // Validate file size
      if (file.size === 0) {
        console.warn('promptResponseService: Skipping empty file:', file.name);
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 
        'video/mp4', 'video/quicktime', 
        'audio/mpeg', 'audio/wav'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        console.warn('promptResponseService: Skipping file with unsupported type:', file.type, file.name);
        return;
      }
      
      formData.append('attachments', file);
    } else {
      // React Native file object
      const fileObj = file as unknown as ReactNativeFile;
      const fileType = fileObj.type || 'image/jpeg';
      const fileName = fileObj.name || `attachment_${index}.jpg`;
      
      if (!fileObj.uri || fileObj.uri.trim() === '') {
        console.warn('promptResponseService: Skipping React Native file with empty URI:', fileName);
        return;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 
        'video/mp4', 'video/quicktime', 
        'audio/mpeg', 'audio/wav'
      ];
      
      if (!allowedTypes.includes(fileType)) {
        console.warn('promptResponseService: Skipping file with unsupported type:', fileType, fileName);
        return;
      }
      
      formData.append('attachments', {
        uri: fileObj.uri,
        type: fileType,
        name: fileName,
      } as any);
    }
  });

  const token = await authService.getAccessToken();
  const url = `${BASE_URL}/responses/${responseId}/attachments`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to replace attachments';
    let errorData: any = {};
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
    } catch (parseError) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error('promptResponseService: Failed to parse error response:', parseError);
    }
    
    console.error('promptResponseService: Replace attachments error:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      errorMessage
    });
    
    throw new Error(errorMessage);
  }

  const result = await response.json();
  // Handle the backend response structure
  let responseData;
  if (result.data && result.data.promptResponse) {
    responseData = result.data.promptResponse;
  } else if (result.promptResponse) {
    responseData = result.promptResponse;
  } else {
    responseData = result.data || result;
  }
  
  return mapPromptResponseFromApi(responseData);
}

// Test function to check if endpoints exist
export async function testEndpoints(): Promise<void> {
  try {
    // Test the base endpoint
    const response = await apiService.get('/responses');
  } catch (error) {
    console.error('promptResponseService: Base endpoint test failed:', error);
  }
} 