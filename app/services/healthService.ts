import {
  CreateGrowthRecordData,
  CreateHealthRecordData,
  GrowthAnalysis,
  GrowthFilter,
  GrowthRecord,
  HealthFilter,
  HealthRecord,
  HealthRecordAttachment,
  UpdateGrowthRecordData,
  UpdateHealthRecordData,
  WHOStandardGrowthData
} from '../types/health';
import { conditionalLog } from '../utils/logUtils';
import apiService from './apiService';
import authService from './authService';

import { API_BASE_URL } from '@env';

// Use the same fallback as apiService
const BASE_URL = API_BASE_URL || "https://growing-together-app.onrender.com/api";

// Data transformation functions to convert MongoDB format to TypeScript interface
const transformGrowthRecord = (record: any): GrowthRecord => {
  // Handle nested response structure
  const growthRecord = record.growthRecord || record;
  
  // Extract childId from child object or use direct childId
  let childId = growthRecord.childId;
  if (growthRecord.child && typeof growthRecord.child === 'object') {
    childId = growthRecord.child._id || growthRecord.child.id;
  } else if (growthRecord.child && typeof growthRecord.child === 'string') {
    childId = growthRecord.child;
  }
  
  
  return {
    id: growthRecord._id || growthRecord.id,
    childId: childId,
    parentId: growthRecord.authorId || growthRecord.parentId, // Use authorId if available, fallback to parentId
    type: growthRecord.type,
    value: growthRecord.value,
    unit: growthRecord.unit,
    date: growthRecord.date,
    source: growthRecord.source,
    notes: growthRecord.notes,
    visibility: growthRecord.visibility || 'private',
    createdAt: growthRecord.createdAt,
    updatedAt: growthRecord.updatedAt,
  };
};

// Helper function to map attachment from API response to frontend interface
function mapHealthRecordAttachment(att: any): HealthRecordAttachment {
  let attachmentId = att._id || att.id;
  
  // Priority 2: Use publicId field if available
  if (!attachmentId) {
    attachmentId = att.publicId;
  }
  
  // Priority 3: Extract from Cloudinary URL (fallback only)
  if (!attachmentId && att.url) {
    const urlMatch = att.url.match(/\/upload\/v\d+\/[^\/]+\/([^\/]+)\.[^\/]+$/);
    if (urlMatch) {
      attachmentId = urlMatch[1];
    } else {
      const altMatches = [
        att.url.match(/\/upload\/[^\/]+\/([^\/]+)\.[^\/]+$/),
        att.url.match(/\/upload\/v\d+\/[^\/]+\/[^\/]+\/([^\/]+)\.[^\/]+$/),
        att.url.match(/\/([^\/]+)\.[^\/]+$/)
      ];
      
      for (let i = 0; i < altMatches.length; i++) {
        if (altMatches[i]) {
          attachmentId = altMatches[i][1];
          break;
        }
      }
    }
  }
  
  return {
    id: attachmentId || `attachment_${Date.now()}`,
    publicId: att.publicId || attachmentId || `attachment_${Date.now()}`,
    url: att.url,
    type: att.type || 'image',
    filename: att.filename || 'attachment',
    size: att.size || 0,
    createdAt: att.createdAt || new Date().toISOString(),
  };
}

const transformHealthRecord = (record: any): HealthRecord => {
  // Handle nested response structure
  const healthRecord = record.healthRecord || record;
  
  // Extract childId from child object or use direct childId
  let childId = healthRecord.childId;
  if (healthRecord.child && typeof healthRecord.child === 'object') {
    childId = healthRecord.child._id || healthRecord.child.id;
  } else if (healthRecord.child && typeof healthRecord.child === 'string') {
    childId = healthRecord.child;
  }
  
  
  return {
    id: healthRecord._id || healthRecord.id,
    childId: childId,
    parentId: healthRecord.authorId || healthRecord.parentId, // Use authorId if available, fallback to parentId
    type: healthRecord.type,
    title: healthRecord.title,
    description: healthRecord.description,
    startDate: healthRecord.startDate || healthRecord.date, // Use 'date' field if 'startDate' is not available
    endDate: healthRecord.endDate,
    doctorName: healthRecord.doctorName || healthRecord.doctor, // Also map 'doctor' to 'doctorName'
    location: healthRecord.location,
    attachments: healthRecord.attachments?.map((att: any) => mapHealthRecordAttachment(att)) || [],
    visibility: healthRecord.visibility || 'private',
    createdAt: healthRecord.createdAt,
    updatedAt: healthRecord.updatedAt,
  };
};

const transformWHOStandardData = (record: any): WHOStandardGrowthData => ({
  id: record._id || record.id,
  age: record.age,
  ageInMonths: record.ageInMonths,
  gender: record.gender,
  weight: {
    minus2SD: record.weight?.minus2SD || record.weightMinus2SD || 0,
    mean: record.weight?.mean || record.weightMean || 0,
    plus2SD: record.weight?.plus2SD || record.weightPlus2SD || 0,
  },
  height: {
    minus2SD: record.height?.minus2SD || record.heightMinus2SD || 0,
    mean: record.height?.mean || record.heightMean || 0,
    plus2SD: record.height?.plus2SD || record.heightPlus2SD || 0,
  },
  isDeleted: record.isDeleted || false,
  deletedAt: record.deletedAt || null,
  deletedBy: record.deletedBy || null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

// WHO Standard Growth Data API functions
export async function getWHOStandardData(ageInMonths: number, gender: 'male' | 'female'): Promise<WHOStandardGrowthData | null> {
  try {
    // Use the correct API endpoint: /who-standards/:gender/age/:ageInMonths
    conditionalLog.health(`[WHO-API] Requesting WHO standard for ${gender} at ${ageInMonths} months`);
    const response = await apiService.get(`/who-standards/${gender}/age/${ageInMonths}`);
    const rawData = response.data || response;
    
    if (!rawData) {
      conditionalLog.health(`[WHO-API] No data returned for ${gender} at ${ageInMonths} months`);
      return null;
    }
    
    conditionalLog.health(`[WHO-API] Successfully fetched WHO standard for ${gender} at ${ageInMonths} months`);
    return transformWHOStandardData(rawData);
  } catch (error: any) {
    conditionalLog.health(`[WHO-API] Error fetching WHO standard for ${gender} at ${ageInMonths} months:`, {
      message: error?.message || 'Unknown error',
      status: error?.status || error?.response?.status,
      url: error?.url || error?.config?.url,
      hasResponseData: !!error?.response?.data
    });
    
    // Re-throw the error instead of using mock data
    throw error;
  }
}

export async function getWHOStandardsInRange(gender: 'male' | 'female', startAge: number, endAge: number): Promise<WHOStandardGrowthData[]> {
  try {
    // Try to get WHO data from a different endpoint that might exist
    // First, let's try to get all WHO data and filter it
    conditionalLog.health(`[WHO-API] Requesting WHO standards range for ${gender}: ${startAge}-${endAge} months`);
    
    // Try different possible endpoints
    let response;
    let data = [];
    
    try {
      // Try the original endpoint first
      const url = `/who-standards/${gender}/range?minAge=${startAge}&maxAge=${endAge}`;
      conditionalLog.health(`[WHO-API] Calling: ${url}`);
      response = await apiService.get(url);
      const rawData = response.data || response || [];
      
      conditionalLog.health(`[WHO-API] Response structure:`, {
        hasResponse: !!response,
        hasData: !!response?.data,
        hasWhoStandards: !!response?.data?.whoStandards,
        isArray: Array.isArray(rawData),
        rawDataLength: Array.isArray(rawData) ? rawData.length : 'not array'
      });
      
      // Handle nested response structure
      if (response && response.data && response.data.data) {
        // Your backend returns: { success: true, data: { data: [...], count: 33, range: {...} } }
        data = response.data.data;
        conditionalLog.health(`[WHO-API] Using response.data.data: ${data.length} items`);
      } else if (response && response.data && response.data.whoStandards) {
        data = response.data.whoStandards;
        conditionalLog.health(`[WHO-API] Using response.data.whoStandards: ${data.length} items`);
      } else if (Array.isArray(rawData)) {
        data = rawData;
        conditionalLog.health(`[WHO-API] Using rawData array: ${data.length} items`);
      } else {
        conditionalLog.health(`[WHO-API] No valid data structure found in response`);
      }
      
      // Log first item if available
      if (data.length > 0) {
        conditionalLog.health(`[WHO-API] First item:`, {
          age: data[0].ageInMonths,
          gender: data[0].gender,
          weight: data[0].weight?.mean
        });
      }
    } catch (firstError) {
      conditionalLog.health(`[WHO-API] First endpoint failed, trying alternative...`);
      
      try {
        // Try getting all WHO data and filtering
        response = await apiService.get(`/who-standards/${gender}`);
        const rawData = response.data || response || [];
        
        if (response && response.data && response.data.whoStandards) {
          data = response.data.whoStandards;
        } else if (Array.isArray(rawData)) {
          data = rawData;
        }
        
        // Filter to the requested range
        data = data.filter((item: any) => {
          const ageInMonths = item.ageInMonths || parseInt(item.age) || 0;
          return ageInMonths >= startAge && ageInMonths <= endAge;
        });
      } catch (secondError) {
        conditionalLog.health(`[WHO-API] Second endpoint also failed, trying generic endpoint...`);
        
        try {
          // Try a generic WHO endpoint
          response = await apiService.get('/who-standards');
          const rawData = response.data || response || [];
          
          if (response && response.data && response.data.whoStandards) {
            data = response.data.whoStandards;
          } else if (Array.isArray(rawData)) {
            data = rawData;
          }
          
          // Filter by gender and age range
          data = data.filter((item: any) => {
            const ageInMonths = item.ageInMonths || parseInt(item.age) || 0;
            const itemGender = item.gender || 'male';
            return itemGender === gender && ageInMonths >= startAge && ageInMonths <= endAge;
          });
        } catch (thirdError) {
          conditionalLog.health(`[WHO-API] All endpoints failed, using hardcoded WHO data`);
          throw new Error('All WHO endpoints failed');
        }
      }
    }
    
    const result = Array.isArray(data) ? data.map(transformWHOStandardData) : [];
    conditionalLog.health(`[WHO-API] Successfully fetched ${result.length} WHO standards for ${gender}: ${startAge}-${endAge} months`);
    
    // If API returned empty data, throw an error
    if (result.length === 0) {
      conditionalLog.health(`[WHO-API] API returned empty data for ${gender}: ${startAge}-${endAge} months`);
      throw new Error(`No WHO standards data available for ${gender} in age range ${startAge}-${endAge} months`);
    }
    
    return result;
  } catch (error: any) {
    conditionalLog.health(`[WHO-API] Error fetching WHO standards range for ${gender}: ${startAge}-${endAge} months:`, {
      message: error?.message || 'Unknown error',
      status: error?.status || error?.response?.status,
      url: error?.url || error?.config?.url,
      hasResponseData: !!error?.response?.data
    });
    
    // Re-throw the error instead of using hardcoded data
    throw error;
  }
}

export async function getAllWHOStandardData(gender?: 'male' | 'female'): Promise<WHOStandardGrowthData[]> {
  try {
    let url = '/who-standards';
    if (gender) {
      // Use the correct API endpoint: /who-standards/:gender
      url = `/who-standards/${gender}`;
    }
    
    conditionalLog.health(`[WHO-API] Requesting all WHO standards for ${gender || 'all genders'}`);
    const response = await apiService.get(url);
    const rawData = response.data || response || [];
    
    // Handle nested response structure
    let data;
    if (response && response.data && response.data.data) {
      // Your backend returns: { success: true, data: { data: [...], count: 33, range: {...} } }
      data = response.data.data;
    } else if (response && response.data && response.data.whoStandards) {
      data = response.data.whoStandards;
    } else if (Array.isArray(rawData)) {
      data = rawData;
    } else {
      data = [];
    }
    
    const result = Array.isArray(data) ? data.map(transformWHOStandardData) : [];
    conditionalLog.health(`[WHO-API] Successfully fetched ${result.length} WHO standards for ${gender || 'all genders'}`);
    
    // If API returned empty data, throw an error
    if (result.length === 0) {
      conditionalLog.health(`[WHO-API] API returned empty data for ${gender || 'all genders'}`);
      throw new Error(`No WHO standards data available for ${gender || 'all genders'}`);
    }
    
    return result;
  } catch (error: any) {
    conditionalLog.health(`[WHO-API] Error fetching all WHO standards for ${gender || 'all genders'}:`, {
      message: error?.message || 'Unknown error',
      status: error?.status || error?.response?.status,
      url: error?.url || error?.config?.url,
      hasResponseData: !!error?.response?.data
    });
    
    // Re-throw the error instead of using hardcoded data
    throw error;
  }
}

// Growth Analysis Functions
export function analyzeGrowth(
  childValue: number,
  childAgeInMonths: number,
  childGender: 'male' | 'female',
  whoStandard: WHOStandardGrowthData,
  type: 'height' | 'weight'
): GrowthAnalysis {
  const standard = type === 'height' ? whoStandard.height : whoStandard.weight;
  
  // Find percentile based on SD (simplified)
  let percentile = 50; // Default to median
  if (childValue <= standard.minus2SD) {
    percentile = 3; // Below -2SD is roughly 3rd percentile
  } else if (childValue <= standard.mean) {
    percentile = 50; // Mean is 50th percentile
  } else if (childValue <= standard.plus2SD) {
    percentile = 97; // Above +2SD is roughly 97th percentile
  } else {
    percentile = 100;
  }
  
  // Determine status based on SD
  let status: GrowthAnalysis['status'];
  if (childValue < standard.minus2SD) {
    status = 'below_p3';
  } else if (childValue < standard.mean) {
    status = 'p25_to_p75';
  } else if (childValue < standard.plus2SD) {
    status = 'p75_to_p90';
  } else {
    status = 'above_p97';
  }
  
  // Generate recommendation
  let recommendation: string | undefined;
  if (status === 'below_p3') {
    recommendation = `Your child's ${type} is below the 3rd percentile. Consider consulting with a pediatrician.`;
  } else if (status === 'above_p97') {
    recommendation = `Your child's ${type} is above the 97th percentile. Consider consulting with a pediatrician.`;
  } else if (status === 'p75_to_p90') {
    recommendation = `Your child's ${type} is above average. Monitor growth and consider discussing with a healthcare provider.`;
  }
  
  return {
    childValue,
    childAgeInMonths,
    childGender,
    whoStandard: whoStandard, // Return the full WHO standard, not just the type-specific part
    percentile,
    status,
    recommendation
  };
}

// Growth Record API functions
// API Endpoints:
// GET /api/growth-records?childId=xxx&type=height&dateRange=6months
// POST /api/growth-records
// PUT /api/growth-records/:id
// DELETE /api/growth-records/:id
export async function getGrowthRecords(childId: string, filter?: GrowthFilter): Promise<GrowthRecord[]> {
  try {
    // Use the original API endpoint structure that the backend expects
    let url = '/growth-records';
    const params = new URLSearchParams();
    
    // Always include childId as required by the API
    params.append('childId', childId);
    
    // Set a high limit to get all historical records (backend defaults to 10)
    params.append('limit', '100');  // Enough for all historical growth records
    
    if (filter) {
      // Don't filter by type to get all growth data
      if (filter.dateRange !== 'all') params.append('dateRange', filter.dateRange);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    conditionalLog.health('Calling growth records API:', { url, childId, filter });
    const response = await apiService.get(url);
    conditionalLog.health('API Response received:', { 
      responseType: typeof response,
      hasData: !!response.data,
      responseKeys: response ? Object.keys(response) : 'no response',
      rawResponse: response
    });
    
    // Handle nested response structure
    let rawData;
    if (response && response.data && response.data.growthRecords) {
      // API returns { success: true, data: { growthRecords: [...] } }
      rawData = response.data.growthRecords;
    } else if (Array.isArray(response)) {
      // Direct array response
      rawData = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      // Direct array in data field
      rawData = response.data;
    } else {
      // Fallback
      rawData = [];
    }
    
    // Transform the data to match TypeScript interface
    const transformedData = Array.isArray(rawData) 
      ? rawData.map(transformGrowthRecord)
      : [];
    
    conditionalLog.health('Fetched growth records:', {
      count: transformedData.length,
      hasData: transformedData.length > 0,
      dataTypes: [...new Set(transformedData.map(record => record.type))],
      dateRange: transformedData.length > 0 ? {
        earliest: transformedData[0]?.date,
        latest: transformedData[transformedData.length - 1]?.date
      } : null,
      rawDataCount: Array.isArray(rawData) ? rawData.length : 'not array'
    });
    
    return transformedData;
  } catch (error) {
    conditionalLog.health('Error fetching growth records:', error);
    throw error;
  }
}

export async function getGrowthRecord(recordId: string): Promise<GrowthRecord> {
  try {
    const response = await apiService.get(`/growth-records/${recordId}`);
    const rawData = response.data || response;
    return transformGrowthRecord(rawData);
  } catch (error) {
    conditionalLog.health('Error fetching growth record:', error);
    throw error;
  }
}

export async function createGrowthRecord(data: CreateGrowthRecordData): Promise<GrowthRecord> {
  try {
    // console.log('[HEALTH-DEBUG] Creating growth record with data:', data);
    const response = await apiService.post('/growth-records', data);
    // console.log('[HEALTH-DEBUG] API Response:', JSON.stringify(response, null, 2));
    // console.log('[HEALTH-DEBUG] Response data:', JSON.stringify(response.data, null, 2));
    
    // Extract the actual record from the nested response structure
    const rawData = response.data?.growthRecord || response.data || response;
    // console.log('[HEALTH-DEBUG] Raw data for transformation:', JSON.stringify(rawData, null, 2));
    
    const transformed = transformGrowthRecord(rawData);
    // console.log('[HEALTH-DEBUG] Transformed record:', JSON.stringify(transformed, null, 2));
    return transformed;
  } catch (error: any) {
    conditionalLog.health('Error creating growth record:', error);
    throw error;
  }
}

export async function updateGrowthRecord(recordId: string, data: UpdateGrowthRecordData): Promise<GrowthRecord> {
  try {
    conditionalLog.health('Updating growth record:', { recordId, data });
    const response = await apiService.put(`/growth-records/${recordId}`, data);
    const rawData = response.data || response;
    conditionalLog.health('API response:', rawData);
    return transformGrowthRecord(rawData);
  } catch (error) {
    conditionalLog.health('Error updating growth record:', error);
    throw error;
  }
}

export async function deleteGrowthRecord(recordId: string): Promise<void> {
  try {
    await apiService.delete(`/growth-records/${recordId}`);
  } catch (error) {
    conditionalLog.health('Error deleting growth record:', error);
    throw error;
  }
}

// Health Record API functions
export async function getHealthRecords(childId: string, filter?: HealthFilter): Promise<HealthRecord[]> {
  try {
    // Use the original API endpoint structure that the backend expects
    let url = '/health-records';
    const params = new URLSearchParams();
    
    // Always include childId as required by the API
    params.append('childId', childId);
    
    // Set a high limit to get all historical records (backend defaults to 10)
    params.append('limit', '100');  // Enough for all historical health records
    
    if (filter) {
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.dateRange !== 'all') params.append('dateRange', filter.dateRange);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiService.get(url);
    
    // Handle nested response structure for health records
    let rawData;
    if (response && response.data && response.data.healthRecords) {
      // API returns { success: true, data: { healthRecords: [...] } }
      rawData = response.data.healthRecords;
    } else if (Array.isArray(response)) {
      // Direct array response
      rawData = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      // Direct array in data field
      rawData = response.data;
    } else {
      // Fallback
      rawData = [];
    }
    
    // Transform the data to match TypeScript interface
    const transformedData = Array.isArray(rawData) 
      ? rawData.map(transformHealthRecord)
      : [];
    
    return transformedData;
  } catch (error) {
    conditionalLog.health('Error fetching health records:', error);
    throw error;
  }
}

export async function getHealthRecord(recordId: string): Promise<HealthRecord> {
  try {
    const response = await apiService.get(`/health-records/${recordId}`);
    const rawData = response.data || response;
    return transformHealthRecord(rawData);
  } catch (error) {
    conditionalLog.health('Error fetching health record:', error);
    throw error;
  }
}

export async function createHealthRecord(data: CreateHealthRecordData): Promise<HealthRecord> {
  try {
    // Check required fields
    const requiredFields = ['child', 'type', 'title', 'description', 'date'];
    const missingFields = requiredFields.filter(field => !data[field as keyof CreateHealthRecordData]);
    
    if (missingFields.length > 0) {
      conditionalLog.health('Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    const response = await apiService.post('/health-records', data);
    
    const rawData = response.data || response;
    
    return transformHealthRecord(rawData);
  } catch (error: any) {
    conditionalLog.health('Error creating health record:', error);
    throw error;
  }
}

export async function updateHealthRecord(recordId: string, data: UpdateHealthRecordData): Promise<HealthRecord> {
  try {
    conditionalLog.health('Updating health record:', { recordId, data });
    const response = await apiService.put(`/health-records/${recordId}`, data);
    const rawData = response.data || response;
    conditionalLog.health('API response:', rawData);
    return transformHealthRecord(rawData);
  } catch (error) {
    conditionalLog.health('Error updating health record:', error);
    throw error;
  }
}

export async function deleteHealthRecord(recordId: string): Promise<void> {
  try {
    await apiService.delete(`/health-records/${recordId}`);
  } catch (error) {
    conditionalLog.health('Error deleting health record:', error);
    throw error;
  }
}

// Utility functions
export function getGrowthChartData(growthRecords: GrowthRecord[]) {
  const heightData: { date: string; height: number }[] = [];
  const weightData: { date: string; weight: number }[] = [];

  growthRecords.forEach(record => {
    if (record.type === 'height') {
      heightData.push({
        date: record.date,
        height: record.value
      });
    } else if (record.type === 'weight') {
      weightData.push({
        date: record.date,
        weight: record.value
      });
    }
  });

  return {
    height: heightData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    weight: weightData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  };
}

// Health Record Attachment Management
export async function updateHealthRecordAttachments(
  recordId: string, 
  attachments: any[], 
  action: 'add' | 'remove' | 'replace' = 'add', 
  attachmentIds: string[] = []
): Promise<HealthRecord> {
  const token = await authService.getAccessToken();
  
  if (!token) {
    throw new Error('Authentication token not available');
  }

  conditionalLog.health(`[HEALTH-ATTACHMENTS] Starting attachment update:`, {
    recordId,
    action,
    attachmentsCount: attachments.length,
    attachmentIdsCount: attachmentIds.length,
    attachments: attachments.map(f => ({ name: f.name, type: f.type, size: f.size }))
  });

  // Handle remove action using the unified attachments endpoint
  if (action === 'remove' && attachmentIds.length > 0) {
    try {
      conditionalLog.health(`[HEALTH-ATTACHMENTS] Removing attachments:`, attachmentIds);
      
      const response = await fetch(`${BASE_URL}/health-records/${recordId}/attachments`, {
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

      conditionalLog.health(`[HEALTH-ATTACHMENTS] Remove response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        conditionalLog.health(`[HEALTH-ATTACHMENTS] Remove error response:`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.error || errorData.message || `Delete attachments failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      conditionalLog.health(`[HEALTH-ATTACHMENTS] Remove success response:`, responseData);
      
      // Handle the actual backend response structure: { success: true, data: { healthRecord: {...} } }
      let healthRecord = responseData.data?.healthRecord || responseData.data || responseData.healthRecord || responseData;

      // If the backend doesn't return the full health record object, fetch it separately
      if (!healthRecord || (!healthRecord._id && !healthRecord.id)) {
        try {
          const updatedHealthRecordResponse = await apiService.get(`/health-records/${recordId}`);
          healthRecord = updatedHealthRecordResponse.data || updatedHealthRecordResponse;
        } catch (fetchError) {
          throw new Error(`Delete attachments completed but failed to retrieve updated health record. Please refresh to see changes.`);
        }
      }

      return transformHealthRecord(healthRecord);
    } catch (error) {
      conditionalLog.health(`[HEALTH-ATTACHMENTS] Remove error:`, error);
      throw error;
    }
  }

  // Handle add and replace actions using the PATCH endpoint
  const formData = new FormData();
  
  // Add the required parameters for the backend
  formData.append('action', action);
  conditionalLog.health(`[HEALTH-ATTACHMENTS] Added action to FormData:`, action);
  
  // Add attachments if this is an add or replace action
  if (action === 'add' || action === 'replace') {
    attachments.forEach((file, index) => {
      conditionalLog.health(`[HEALTH-ATTACHMENTS] Adding attachment ${index}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        uri: file.uri ? file.uri.substring(0, 50) + '...' : 'no uri'
      });
      
      conditionalLog.health(`[HEALTH-ATTACHMENTS] File object for FormData:`, file);
      
      // Append the file to FormData - use the file directly
      formData.append('attachments', file as any);
    });
  }

  conditionalLog.health(`[HEALTH-ATTACHMENTS] Making request to:`, `${BASE_URL}/health-records/${recordId}/attachments`);
  conditionalLog.health(`[HEALTH-ATTACHMENTS] Request method: PATCH`);
  conditionalLog.health(`[HEALTH-ATTACHMENTS] Action:`, action);
  conditionalLog.health(`[HEALTH-ATTACHMENTS] Attachments to upload:`, attachments.map(f => ({ name: f.name, type: f.type, size: f.size })));

  const response = await fetch(`${BASE_URL}/health-records/${recordId}/attachments`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type for FormData, let the browser set it with boundary
    },
    body: formData,
  });

  conditionalLog.health(`[HEALTH-ATTACHMENTS] Response status:`, response.status);
  conditionalLog.health(`[HEALTH-ATTACHMENTS] Response statusText:`, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    conditionalLog.health(`[HEALTH-ATTACHMENTS] Raw error response:`, errorText);
    
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    conditionalLog.health(`[HEALTH-ATTACHMENTS] Parsed error data:`, errorData);
    conditionalLog.health(`[HEALTH-ATTACHMENTS] Request details for debugging:`, {
      url: `${BASE_URL}/health-records/${recordId}/attachments`,
      method: 'PATCH',
      action,
      attachmentCount: attachments.length
    });
    
    throw new Error(errorData.error || errorData.message || `Attachment ${action} failed: ${response.statusText}`);
  }

  const responseData = await response.json();
  conditionalLog.health(`[HEALTH-ATTACHMENTS] Success response data:`, responseData);
  
  // Handle the actual backend response structure: { success: true, data: { healthRecord: {...} } }
  let healthRecord = responseData.data?.healthRecord || responseData.data || responseData.healthRecord || responseData;

  // If the backend doesn't return the full health record object, fetch it separately
  if (!healthRecord || (!healthRecord._id && !healthRecord.id)) {
    try {
      const updatedHealthRecordResponse = await apiService.get(`/health-records/${recordId}`);
      healthRecord = updatedHealthRecordResponse.data || updatedHealthRecordResponse;
    } catch (fetchError) {
      throw new Error(`Attachment ${action} completed but failed to retrieve updated health record. Please refresh to see changes.`);
    }
  }

  return transformHealthRecord(healthRecord);
} 