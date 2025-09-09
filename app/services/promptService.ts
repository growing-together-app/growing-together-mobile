import { sanitizeObjectId } from '../utils/validation';
import apiService from "./apiService";

// Type definitions
export interface Prompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptData {
  title: string;
  content: string;
  category?: 'personal' | 'academic' | 'social' | 'emotional' | 'family' | 'hobbies' | 'future' | 'other';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  ageRange?: '0-3' | '4-6' | '7-9' | '10-12' | '13-15' | '16-18';
  tags?: string[];
}

export interface UpdatePromptData {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface GetPromptsParams {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  isActive?: boolean;
  search?: string;
}

export interface PromptResponse {
  id: string;
  promptId: string;
  childId: string;
  parentId?: string | { // Can be string or object with user info (from authorId or parentId)
    _id: string;
    id: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    name?: string;
  };
  content: string;
  attachments?: PromptResponseAttachment[];
  visibility?: 'private' | 'public';
  feedback?: {
    rating: number;
    comment?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PromptResponseAttachment {
  id: string;
  publicId: string;
  url: string;
  type: "image" | "video" | "audio";
  filename: string;
  size: number;
  createdAt: string;
}

export interface CreatePromptResponseData {
  promptId: string;
  childId: string;
  content: string;
  attachments?: File[];
  visibility?: 'private' | 'public';
}

export interface UpdatePromptResponseData {
  content?: string;
  attachments?: File[];
  visibility?: 'private' | 'public';
}

export interface GetResponsesParams {
  childId: string;
  page?: number;
  limit?: number;
  promptId?: string;
}

export interface FeedbackData {
  rating: number;
  comment?: string;
}

// Helper function to map API response to Prompt interface
function mapPromptFromApi(apiPrompt: any): Prompt {
  const mappedPrompt = {
    id: apiPrompt._id || apiPrompt.id || crypto.randomUUID(),
    title: apiPrompt.title || "",
    content: apiPrompt.question || apiPrompt.content || "",
    category: apiPrompt.category,
    tags: apiPrompt.tags || [],
    isActive: apiPrompt.isActive !== undefined ? apiPrompt.isActive : true,
    createdAt: apiPrompt.createdAt || "",
    updatedAt: apiPrompt.updatedAt || "",
  };
  
  return mappedPrompt;
}

// API functions
export async function getPrompts(
  params: GetPromptsParams = {}
): Promise<{ prompts: Prompt[]; total: number; page: number; limit: number }> {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.category) queryParams.append("category", params.category);
    if (params.tags) queryParams.append("tags", params.tags.join(","));
    if (params.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    if (params.search) queryParams.append("search", params.search);

    const response = await apiService.get(`/prompts?${queryParams.toString()}`);
    const data = response.data || response;

    // Map the prompts to ensure they have the correct structure
    const mappedPrompts = (data.prompts || []).map(mapPromptFromApi);

    return {
      prompts: mappedPrompts,
      total: data.total || 0,
      page: data.currentPage || 1,
      limit: data.limit || 10,
    };
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error('Error fetching prompts:', error);
    // Wrap the error with additional context
    throw new Error(`Failed to fetch prompts: ${error.message}`);
  }
}

export async function getPrompt(promptId: string): Promise<Prompt> {
  try {
    const sanitizedId = sanitizeObjectId(promptId);
    const response = await apiService.get(`/prompts/${sanitizedId}`);
    const data = response.data || response;
    return mapPromptFromApi(data);
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error(`Error fetching prompt ${promptId}:`, error);
    // Wrap the error with additional context
    throw new Error(`Failed to fetch prompt ${promptId}: ${error.message}`);
  }
}

export async function createPrompt(data: CreatePromptData): Promise<Prompt> {
  // Try JSON approach instead of FormData
  const requestData = {
    title: data.title,
    question: data.content, // Use 'question' field for backend
    category: data.category || 'other',
    frequency: data.frequency || 'daily',
    ageRange: data.ageRange || '4-6',
    isActive: true,
    tags: data.tags || [],
  };
  
  try {
    // Use apiService with JSON data
    const response = await apiService.post("/prompts", requestData);
    const responseData = response.data || response;
    return mapPromptFromApi(responseData);
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error('Error creating prompt:', error);
    // Wrap the error with additional context
    throw new Error(`Failed to create prompt: ${error.message}`);
  }
}

export async function updatePrompt(
  promptId: string,
  data: UpdatePromptData
): Promise<Prompt> {
  try {
    const sanitizedId = sanitizeObjectId(promptId);
    const response = await apiService.put(`/prompts/${sanitizedId}`, data);
    const responseData = response.data || response;
    return mapPromptFromApi(responseData);
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error(`Error updating prompt ${promptId}:`, error);
    // Wrap the error with additional context
    throw new Error(`Failed to update prompt ${promptId}: ${error.message}`);
  }
}

export async function deletePrompt(promptId: string): Promise<void> {
  try {
    const sanitizedId = sanitizeObjectId(promptId);
    await apiService.delete(`/prompts/${sanitizedId}`);
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error(`Error deleting prompt ${promptId}:`, error);
    // Wrap the error with additional context
    throw new Error(`Failed to delete prompt ${promptId}: ${error.message}`);
  }
}

export async function getPromptResponses(
  promptId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{
  responses: PromptResponse[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    const response = await apiService.get(
      `/prompts/${promptId}/responses?${queryParams.toString()}`
    );
    return response.data || response;
  } catch (error: any) {
    // Log the error for debugging and monitoring
    console.error(`Error fetching prompt responses for prompt ${promptId}:`, error);
    // Wrap the error with additional context
    throw new Error(`Failed to fetch prompt responses for prompt ${promptId}: ${error.message}`);
  }
}
