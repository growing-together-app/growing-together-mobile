import { conditionalLog } from '../utils/logUtils';
import apiService from './apiService';

// Type definitions
export interface GrowthRecord {
  id: string;
  childId: string;
  familyGroupId?: string;
  type: 'height' | 'weight';
  visibility: 'private' | 'public';
  value: number;
  unit: 'cm' | 'kg';
  date: string;
  source: 'doctor' | 'home' | 'hospital' | 'clinic' | 'other';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrowthRecordData {
  childId: string;
  familyGroupId?: string;
  type: 'height' | 'weight';
  visibility?: 'private' | 'public';
  value: number;
  unit: 'cm' | 'kg';
  date: string;
  source?: 'doctor' | 'home' | 'hospital' | 'clinic' | 'other';
  notes?: string;
}

export interface UpdateGrowthRecordData {
  type?: 'height' | 'weight';
  visibility?: 'private' | 'public';
  value?: number;
  unit?: 'cm' | 'kg';
  date?: string;
  source?: 'doctor' | 'home' | 'hospital' | 'clinic' | 'other';
  notes?: string;
}

export interface GetGrowthRecordsParams {
  childId: string;
  type?: 'height' | 'weight';
  visibility?: 'private' | 'public';
  startDate?: string;
  endDate?: string;
  source?: 'doctor' | 'home' | 'hospital' | 'clinic' | 'other';
  page?: number;
  limit?: number;
}

// Growth record service functions
export async function getGrowthRecords(params: GetGrowthRecordsParams): Promise<{ records: GrowthRecord[]; total: number; page: number; limit: number }> {
  const queryParams = new URLSearchParams();
  
  // Required parameter
  queryParams.append('childId', params.childId);
  
  // Optional parameters
  if (params.type) queryParams.append('type', params.type);
  if (params.visibility) queryParams.append('visibility', params.visibility);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.source) queryParams.append('source', params.source);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `/growth-records?${queryString}` : '/growth-records';
  
  conditionalLog.general('Growth API Request:', { url, params, queryString });
  
  const response = await apiService.get(url);
  const responseData = response.data || response;
  
  // Handle different possible response structures
  let records = [];
  let total = 0;
  let page = 1;
  let limit = 50;
  
  if (responseData?.records) {
    records = responseData.records;
    total = responseData.total || responseData.records.length;
    page = responseData.page || 1;
    limit = responseData.limit || 50;
  } else if (responseData?.data) {
    records = responseData.data;
    total = responseData.count || responseData.total || responseData.data.length;
    page = responseData.page || 1;
    limit = responseData.limit || 50;
  } else if (Array.isArray(responseData)) {
    records = responseData;
    total = responseData.length;
    page = 1;
    limit = 50;
  }
  
  // Map API fields to frontend interface
  const mappedRecords = records.map((record: any) => ({
    id: record._id || record.id,
    childId: record.child || record.childId,
    parentId: record.authorId || record.parentId, // Use authorId if available, fallback to parentId
    familyGroupId: record.familyGroupId,
    type: record.type,
    visibility: record.visibility || 'private',
    value: record.value,
    unit: record.unit,
    date: record.date || record.createdAt,
    source: record.source || 'home',
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }));
  
  return { records: mappedRecords, total, page, limit };
}

export async function getGrowthRecordById(recordId: string): Promise<GrowthRecord> {
  const response = await apiService.get(`/growth-records/${recordId}`);
  const record = response.data || response;
  
  return {
    id: record._id || record.id,
    childId: record.child || record.childId,
    familyGroupId: record.familyGroupId,
    type: record.type,
    visibility: record.visibility || 'private',
    value: record.value,
    unit: record.unit,
    date: record.date || record.createdAt,
    source: record.source || 'home',
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function createGrowthRecord(data: CreateGrowthRecordData): Promise<GrowthRecord> {
  conditionalLog.general('Creating growth record with data:', data);
  
  const response = await apiService.post('/growth-records', data);
  const record = response.data || response;
  
  return {
    id: record._id || record.id,
    childId: record.child || record.childId,
    familyGroupId: record.familyGroupId,
    type: record.type,
    visibility: record.visibility || 'private',
    value: record.value,
    unit: record.unit,
    date: record.date || record.createdAt,
    source: record.source || 'home',
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function updateGrowthRecord(recordId: string, data: UpdateGrowthRecordData): Promise<GrowthRecord> {
  conditionalLog.general('Updating growth record:', { recordId, data });
  
  const response = await apiService.put(`/growth-records/${recordId}`, data);
  const record = response.data || response;
  
  return {
    id: record._id || record.id,
    childId: record.child || record.childId,
    familyGroupId: record.familyGroupId,
    type: record.type,
    visibility: record.visibility || 'private',
    value: record.value,
    unit: record.unit,
    date: record.date || record.createdAt,
    source: record.source || 'home',
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function deleteGrowthRecord(recordId: string): Promise<void> {
  await apiService.delete(`/growth-records/${recordId}`);
} 