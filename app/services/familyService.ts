import { conditionalLog } from '../utils/logUtils';
import apiService, { API_BASE_URL_EXPORT } from './apiService';
import authService from './authService';

// Utility function to transform API response to FamilyGroup interface
function transformFamilyGroupData(group: any): FamilyGroup {
  
  // Handle nested response structure from getFamilyGroupDetails
  const groupData = group.group || group;
  const members = group.members || groupData.members || [];
  
  // Use createdBy as ownerId since that's what's stored in MongoDB
  const ownerId = groupData.createdBy || group.createdBy || group.ownerId;

  const transformed = {
    id: groupData._id || group._id || group.id,
    name: groupData.name || group.name,
    description: groupData.description || group.description,
    avatarUrl: groupData.avatar || group.avatar || group.avatarUrl,
    ownerId: ownerId,
    members: members.map((member: any) => ({
      id: member._id || member.id,
      userId: member.userId?._id || member.userId?.id || member.userId,
      groupId: groupData._id || group._id || group.id,
      role: member.role === 'admin' ? 'admin' : member.role === 'owner' ? 'owner' : member.role === 'parent' ? 'parent' : 'member',
      joinedAt: member.joinedAt,
      user: member.userId && typeof member.userId === 'object' ? {
        id: member.userId._id || member.userId.id,
        firstName: member.userId.firstName,
        lastName: member.userId.lastName,
        avatarUrl: member.userId.avatar || member.userId.avatarUrl,
      } : undefined,
    })),
    children: groupData.children || group.children, // Add children to transformed object
    createdAt: groupData.createdAt || group.createdAt,
    updatedAt: groupData.updatedAt || group.updatedAt,
  };
  
  return transformed;
}

// Type definitions
export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  members: FamilyMember[];
  children?: any[]; // Add children field
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'owner' | 'admin' | 'parent' | 'member';
  joinedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export interface CreateFamilyGroupData {
  name: string;
  description?: string;
  avatarUrl?: string;
}

export interface UpdateFamilyGroupData {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

// API functions
export async function getFamilyGroups(): Promise<FamilyGroup[]> {
  try {
    // Get all family groups the current user is a member of
    const response = await apiService.get('/family-groups/my-groups');
    
    // Handle nested response structure: response.data.groups or response.groups
    const responseData = response.data || response;
    const groups = responseData.groups || responseData;
        
    // If no groups exist, return empty array
    if (!groups || !Array.isArray(groups)) {
      return [];
    }
    
    // Transform and return all groups
    const transformed = groups.map(group => transformFamilyGroupData(group));
    return transformed;
  } catch (error: any) {    // If the error is 404 (no family groups found), return empty array instead of throwing
    if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('No family group')) {
      return [];
    }
    // For other errors, re-throw to maintain error handling
    throw error;
  }
}

// Get the user's primary/first family group (for backward compatibility)
export async function getPrimaryFamilyGroup(): Promise<FamilyGroup | null> {
  try {
    // Get the current user's primary family group (first group for backward compatibility)
    const response = await apiService.get('/family-groups/my-group');
    const group = response.data || response;
        
    // If no group exists, return null
    if (!group || (!group.id && !group._id)) {
      conditionalLog.family('No primary family group found, returning null');
      return null;
    }
    
    // Transform and return single group
    const transformed = transformFamilyGroupData(group);
    return transformed;
  } catch (error: any) {    // If the error is 404 (no family group found), return null instead of throwing
    if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('No family group')) {
      conditionalLog.family('404 error for primary family group, returning null');
      return null;
    }
    // For other errors, re-throw to maintain error handling
    throw error;
  }
}

export async function getFamilyGroup(groupId: string): Promise<FamilyGroup> {
  try {
    const response = await apiService.get(`/family-groups/${groupId}/details`);
    const group = response.data || response;
    const transformed = transformFamilyGroupData(group);
    return transformed;
  } catch (error) {
    console.error('Error fetching family group:', error);
    throw error;
  }
}

export async function createFamilyGroup(data: CreateFamilyGroupData): Promise<FamilyGroup> {
  try {
    const response = await apiService.post('/family-groups', data);
    const group = response.data || response;
    return transformFamilyGroupData(group);
  } catch (error: any) {
    conditionalLog.family('Error creating family group:', error);
    if (error.response) {
      if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid family group data');
      } else if (error.response.status === 409) {
        throw new Error('You already have a family group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to create family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to create family group');
    } else {
      throw new Error('Failed to create family group: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function updateFamilyGroup(groupId: string, data: UpdateFamilyGroupData): Promise<FamilyGroup> {
  try {
    const response = await apiService.patch(`/family-groups/${groupId}`, data);
    const group = response.data || response;
    return transformFamilyGroupData(group);
  } catch (error: any) {
    conditionalLog.family('Error updating family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to update this family group');
      } else if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid update data');
      } else {
        throw new Error(error.response.data?.message || 'Failed to update family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to update family group');
    } else {
      throw new Error('Failed to update family group: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function updateFamilyGroupDetails(groupId: string, data: {
  name: string;
  description?: string;
  avatar?: string;
}): Promise<FamilyGroup> {
  try {
    const response = await apiService.patch(`/family-groups/${groupId}`, data);
    const group = response.data || response;
    return transformFamilyGroupData(group);
  } catch (error: any) {
    conditionalLog.family('Error updating family group details:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to update this family group');
      } else if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid update data');
      } else {
        throw new Error(error.response.data?.message || 'Failed to update family group details');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to update family group details');
    } else {
      throw new Error('Failed to update family group details: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function deleteFamilyGroup(groupId: string): Promise<void> {
  try {
    await apiService.delete(`/family-groups/${groupId}`);
  } catch (error: any) {
    conditionalLog.family('Error deleting family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to delete this family group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to delete family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to delete family group');
    } else {
      throw new Error('Failed to delete family group: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function joinFamilyGroup(groupId: string, inviteCode?: string): Promise<FamilyGroup> {
  try {
    const response = await apiService.post(`/family-groups/${groupId}/join`, { inviteCode });
    const group = response.data || response;
    return transformFamilyGroupData(group);
  } catch (error: any) {
    conditionalLog.family('Error joining family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid invite code');
      } else if (error.response.status === 409) {
        throw new Error('You are already a member of this family group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to join family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to join family group');
    } else {
      throw new Error('Failed to join family group: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function leaveFamilyGroup(groupId: string): Promise<void> {
  try {
    await apiService.post(`/family-groups/${groupId}/leave`);
  } catch (error: any) {
    conditionalLog.family('Error leaving family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You cannot leave this family group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to leave family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to leave family group');
    } else {
      throw new Error('Failed to leave family group: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function inviteToFamilyGroup(groupId: string, email: string, role: 'parent' | 'admin' | 'member' = 'parent'): Promise<{ token: string }> {
  try {
    const response = await apiService.post('/family-groups/invite', { 
      email, 
      groupId, 
      role 
    });
    return response.data || response;
  } catch (error: any) {
    conditionalLog.family('Error inviting to family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to invite members');
      } else if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid email address');
      } else if (error.response.status === 409) {
        throw new Error('User is already a member of this family group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to send invitation');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to send invitation');
    } else {
      throw new Error('Failed to send invitation: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function joinGroupFromInvitation(token: string, userData: {
  firstName: string;
  lastName: string;
  password: string;
  dateOfBirth: string;
}): Promise<{ groupId: string; role: string }> {
  try {
    const response = await apiService.post('/family-groups/join-group-from-invitation', {
      token,
      ...userData
    });
    return response.data || response;
  } catch (error: any) {
    console.error('Error joining group from invitation:', error);
    throw new Error(error.message || 'Failed to join group from invitation');
  }
}

export async function acceptInvitation(token: string): Promise<{ groupId: string; role: string }> {
  try {
    const response = await apiService.post('/family-groups/accept-invitation', {
      token
    });
    const result = response.data || response;
    return result;
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    
    // Handle specific backend errors
    if (error.response) {
      if (error.response.status === 400) {
        if (error.response.data?.message?.includes('expired')) {
          throw new Error('This invitation has expired. Please ask the group owner to send a new invitation.');
        } else if (error.response.data?.message?.includes('invalid')) {
          throw new Error('This invitation is invalid. Please ask the group owner to send a new invitation.');
        } else {
          throw new Error(error.response.data?.message || 'Failed to accept invitation');
        }
      } else if (error.response.status === 404) {
        throw new Error('Invitation not found. Please check the invitation link.');
      } else if (error.response.status === 409) {
        throw new Error('You have already joined this family group.');
      } else {
        throw new Error(error.response.data?.message || 'Failed to accept invitation');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to accept invitation');
    } else {
      throw new Error('Failed to accept invitation: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function getPendingInvitations(groupId: string): Promise<{
  invitations: {
    _id: string;
    email: string;
    role: string;
    createdAt: string;
    expiresAt: string;
  }[];
}> {
  try {
    const response = await apiService.get(`/family-groups/${groupId}/pending-invitations`);
    return response.data || response;
  } catch (error: any) {
    conditionalLog.family('Error getting pending invitations:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to view invitations');
      } else {
        throw new Error(error.response.data?.message || 'Failed to get pending invitations');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to get pending invitations');
    } else {
      throw new Error('Failed to get pending invitations: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function cancelInvitation(groupId: string, invitationId: string): Promise<void> {
  try {
    await apiService.delete(`/family-groups/${groupId}/invitations/${invitationId}`);
  } catch (error: any) {
    conditionalLog.family('Error canceling invitation:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Invitation not found or already cancelled');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to cancel this invitation');
      } else {
        throw new Error(error.response.data?.message || 'Failed to cancel invitation');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to cancel invitation');
    } else {
      throw new Error('Failed to cancel invitation: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function resendInvitation(groupId: string, invitationId: string): Promise<void> {
  try {
    await apiService.post(`/family-groups/${groupId}/invitations/${invitationId}/resend`);
  } catch (error: any) {
    conditionalLog.family('Error resending invitation:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Invitation not found or already expired');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to resend this invitation');
      } else if (error.response.status === 429) {
        throw new Error('Too many resend attempts. Please wait before trying again');
      } else {
        throw new Error(error.response.data?.message || 'Failed to resend invitation');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to resend invitation');
    } else {
      throw new Error('Failed to resend invitation: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function getInvitationStats(groupId: string): Promise<{
  stats: {
    totalInvitations: number;
    pendingInvitations: number;
    acceptedInvitations: number;
    expiredInvitations: number;
  };
}> {
  try {
    const response = await apiService.get(`/family-groups/${groupId}/invitation-stats`);
    return response.data || response;
  } catch (error: any) {
    conditionalLog.family('Error getting invitation stats:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to view invitation stats');
      } else {
        throw new Error(error.response.data?.message || 'Failed to get invitation stats');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to get invitation stats');
    } else {
      throw new Error('Failed to get invitation stats: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function addChildToFamilyGroup(groupId: string, childId: string): Promise<void> {
  try {
    // Validate inputs
    if (!groupId || !childId) {
      throw new Error('Group ID and Child ID are required');
    }
    
    const response = await apiService.post(`/family-groups/${groupId}/children`, { childId });
    
    // Validate response
    if (!response) {
      throw new Error('No response received from server');
    }
  } catch (error: any) {
    conditionalLog.family('Error adding child to family group:', error);
    
    // Handle different types of errors
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group or child not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to add children to this group');
      } else if (error.response.status === 409) {
        throw new Error('Child is already a member of this family group');
      } else if (error.response.status === 400) {
        throw new Error('Invalid request: ' + (error.response.data?.message || 'Bad request'));
      } else if (error.response.status >= 500) {
        throw new Error('Server error: Please try again later');
      } else {
        throw new Error(error.response.data?.message || 'Failed to add child to family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to add child to family group');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Failed to add child to family group: Unknown error');
    }
  }
}

export async function removeChildFromFamilyGroup(groupId: string, childId: string): Promise<void> {
  try {
    await apiService.delete(`/family-groups/${groupId}/children/${childId}`);
  } catch (error: any) {
    conditionalLog.family('Error removing child from family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group or child not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to remove children from this group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to remove child from family group');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to remove child from family group');
    } else {
      throw new Error('Failed to remove child from family group: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function getFamilyGroupChildren(groupId: string): Promise<any[]> {
  try {
    console.log('Fetching children for group:', groupId);
    const response = await apiService.get(`/family-groups/${groupId}/children`);
    const result = response.data || response;
    console.log('API response for group children:', {
      groupId,
      responseType: typeof result,
      isArray: Array.isArray(result),
      childrenCount: Array.isArray(result) ? result.length : 'not array',
      rawResponse: result
    });
    return result;
  } catch (error: any) {
    conditionalLog.family('Error getting family group children:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Family group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to view children in this group');
      } else {
        throw new Error(error.response.data?.message || 'Failed to get family group children');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to get family group children');
    } else {
      throw new Error('Failed to get family group children: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function uploadFamilyGroupAvatar(groupId: string, fileUri: string): Promise<{ avatar: string }> {
  try {
    // Create FormData for file upload
    const formData = new FormData();
    
    // Get file name from URI
    const fileName = fileUri.split('/').pop() || 'avatar.jpg';
    
    // Append the file to FormData
    formData.append('avatar', {
      uri: fileUri,
      type: 'image/jpeg', // You might want to detect this dynamically
      name: fileName,
    } as any);

    // Use a separate axios instance for file uploads to avoid JSON content-type issues
    const token = await authService.getAccessToken();
    
    // Use the correct base URL
    const baseURL = API_BASE_URL_EXPORT || "https://growing-together-app.onrender.com/api";
    const uploadUrl = `${baseURL}/family-groups/${groupId}/avatar`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload group avatar');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Avatar upload error:', error);
    throw error;
  }
}

export async function getFamilyGroupTimeline(groupId: string, page: number = 1, limit: number = 20): Promise<{
  timeline: any[];
  children: any[];
  permissions: {
    userRole: string;
    isOwner: boolean;
    ownedChildren: number;
    canSeeAllContent: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}> {
  try {
    // Add console.log to debug the API call
    console.log('🔍 Fetching timeline for group:', groupId, 'page:', page, 'limit:', limit);
    
    const response = await apiService.get(`/family-groups/${groupId}/timeline?page=${page}&limit=${limit}`);
    
    console.log('📡 Timeline API response:', {
      status: response.status,
      hasData: !!response.data,
      responseKeys: response.data ? Object.keys(response.data) : 'no data',
      timelineLength: response.data?.timeline?.length || 0
    });
    
    const data = response.data || response;
    return data;
  } catch (error: any) {
    console.error('❌ Error fetching family group timeline:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return {
      timeline: [],
      children: [],
      permissions: {
        userRole: 'member',
        isOwner: false,
        ownedChildren: 0,
        canSeeAllContent: false,
      },
      pagination: {
        page: 1,
        limit: 20,
        hasMore: false,
      },
    };
  }
}

// Helper function to get user info by ID
export async function getUserInfo(userId: string): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
} | null> {
  try {
    const response = await apiService.get(`/users/${userId}`);
    const user = response.data || response;
    return {
      id: user._id || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatar || user.avatarUrl,
    };
  } catch (error) {
    console.warn(`Failed to get user info for ${userId}:`, error);
    return null;
  }
} 

export async function getMyPendingInvitations(): Promise<{
  invitations: {
    _id: string;
    groupId: string;
    groupName: string;
    groupAvatar?: string;
    email: string;
    role: string;
    status: string;
    expiresAt?: string;
    createdAt?: string;
    sentAt?: string;
    invitedBy: string;
    token?: string; // Add token for decline functionality
  }[];
  total: number;
}> {
  try {
    const response = await apiService.get('/family-groups/my-invitations');
    return response.data || response;
  } catch (error: any) {
    conditionalLog.family('Error getting my invitations:', error);
    if (error.response) {
      if (error.response.status === 404) {
        return { invitations: [], total: 0 };
      } else {
        throw new Error(error.response.data?.message || 'Failed to get my invitations');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to get my invitations');
    } else {
      throw new Error('Failed to get my invitations: ' + (error.message || 'Unknown error'));
    }
  }
}

export async function declineInvitation(token: string): Promise<void> {
  try {
    await apiService.post('/family-groups/decline-invitation', { token });
  } catch (error: any) {
    console.error('Error declining invitation:', error);
    
    // Handle specific backend errors
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Invitation not found or already processed.');
      } else if (error.response.status === 400) {
        if (error.response.data?.message?.includes('expired')) {
          throw new Error('This invitation has expired and cannot be declined.');
        } else {
          throw new Error(error.response.data?.message || 'Invalid invitation');
        }
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to decline this invitation.');
      } else {
        throw new Error(error.response.data?.message || 'Failed to decline invitation');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to decline invitation');
    } else {
      // Handle backend validation errors
      if (error.message && error.message.includes('validation failed')) {
        if (error.message.includes('status') && (error.message.includes('declined') || error.message.includes('rejected'))) {
          throw new Error('Backend does not support declined/rejected status. Please contact administrator.');
        } else {
          throw new Error('Invalid invitation data. Please try again.');
        }
      } else {
        throw new Error('Failed to decline invitation: ' + (error.message || 'Unknown error'));
      }
    }
  }
}

// Remove member from family group (only for owners and admins)
export async function removeMemberFromFamilyGroup(groupId: string, memberId: string): Promise<void> {
  try {
    const url = `/family-groups/${groupId}/members/${memberId}`;
    await apiService.delete(url);
  } catch (error: any) {
    conditionalLog.family('Error removing member from family group:', error);
    if (error.response) {
      if (error.response.status === 404) {
        throw new Error('Member or group not found');
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to remove this member');
      } else if (error.response.status === 400) {
        throw new Error(error.response.data?.message || 'Cannot remove this member');
      } else {
        throw new Error(error.response.data?.message || 'Failed to remove member');
      }
    } else if (error.request) {
      throw new Error('Network error: Unable to remove member');
    } else {
      throw new Error('Failed to remove member: ' + (error.message || 'Unknown error'));
    }
  }
} 