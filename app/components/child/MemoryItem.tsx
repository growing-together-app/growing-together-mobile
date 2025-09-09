import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateMemory } from '../../redux/slices/memorySlice';
import { commentService } from '../../services/commentService';
import { Memory } from '../../services/memoryService';
import { User } from '../../services/userService';
import { CommentModal } from '../CommentSystem';
import Avatar from '../ui/Avatar';
import ReactionBar from '../ui/ReactionBar';
import VisibilityToggle from '../ui/VisibilityToggle';
import MemoryMediaViewer from './MemoryMediaViewer';

interface MemoryItemProps {
  memory: Memory;
  creator?: User;
  onPress?: (_memory: Memory) => void;
  onEdit?: (_memory: Memory) => void;
  onDelete?: (_memory: Memory) => void;
  onLike?: (_memory: Memory) => void;
  onComment?: (_memory: Memory) => void;
}

export default function MemoryItem({ 
  memory, 
  creator,
  onPress: _onPress, 
  onEdit, 
  onDelete, 
  onLike, 
  onComment 
}: MemoryItemProps) {

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const userCurrentUser = useAppSelector((state) => state.user.currentUser);
  const { children } = useAppSelector((state) => state.children);
  
  // Combine user info from both auth and user slices
  const currentUser = userCurrentUser || authUser;
  
  // Check if current user is the owner of the child (not just a member)
  // Only the owner can see visibility toggle and edit/delete buttons
  const getChildId = (childId: any) => {
    if (typeof childId === 'string') return childId;
    if (childId && typeof childId === 'object' && childId._id) return childId._id;
    if (childId && typeof childId === 'object' && childId.id) return childId.id;
    return null;
  };
  
  const memoryChildId = getChildId(memory?.childId);
  
  // Helper function to get parentId from child
  const getParentId = (parentId: any) => {
    if (typeof parentId === 'string') return parentId;
    if (parentId && typeof parentId === 'object' && parentId._id) return parentId._id;
    if (parentId && typeof parentId === 'object' && parentId.id) return parentId.id;
    return null;
  };
  
  const isOwner = currentUser && memory && memoryChildId && 
    children && children.some(child => {
      const childId = child.id;
      const childParentId = getParentId(child.parentId);
      const currentUserId = currentUser.id;
      
      return childId === memoryChildId && childParentId === currentUserId;
    });
  

  const handleVisibilityUpdate = async (newVisibility: 'private' | 'public') => {
    try {
      await dispatch(updateMemory({
        memoryId: memory.id,
        data: { visibility: newVisibility }
      })).unwrap();
    } catch (error) {
      throw error; // Re-throw to let VisibilityToggle handle the error
    }
  };

  const handleCommentPress = () => {
    setShowCommentModal(true);
    onComment?.(memory);
  };

  // Fetch comment count
  useEffect(() => {
    if (!memory?.id) return;
    
    const fetchCommentCount = async () => {
      try {
        const response = await commentService.getComments('memory', memory.id, 1, 1);
        
        // Handle nested response format from backend
        let total = 0;
        const responseData = response as any;
        if (responseData.data?.pagination?.total) {
          // Backend returns: { data: { pagination: { total: 5 } } }
          total = responseData.data.pagination.total;
        } else if (responseData.pagination?.total) {
          // Direct format
          total = responseData.pagination.total;
        }
        
        setCommentCount(total);
      } catch (error) {
        console.error('Error fetching comment count:', error);
        setCommentCount(0);
      }
    };

    fetchCommentCount();
  }, [memory?.id]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays > 0) {
      return `${diffInDays} ngày trước`;
    } else if (diffInHours > 0) {
      return `${diffInHours} giờ trước`;
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes > 0) {
        return `${diffInMinutes} phút trước`;
      } else {
        return 'Vừa xong';
      }
    }
  };

  const getCreatorName = () => {
    // First priority: Use creator object if available
    if (creator && creator.firstName && creator.firstName.trim()) {
      const firstName = creator.firstName.trim();
      const lastName = creator.lastName && creator.lastName.trim() ? creator.lastName.trim() : '';
      return lastName ? `${firstName} ${lastName}` : firstName;
    }
    
    // Second priority: If no creator but we have current user and this is their memory
    if (currentUser && memory.parentId) {
      const parentId = typeof memory.parentId === 'string' ? memory.parentId : 
                      (memory.parentId as any)?._id || (memory.parentId as any)?.id;
      
      if (parentId === currentUser.id) {
        // Use currentUser name even if firstName is undefined
        const firstName = currentUser.firstName || 'User';
        const lastName = currentUser.lastName || '';
        return lastName ? `${firstName} ${lastName}` : firstName;
      }
    }
    
    // Third priority: If we have current user info but no specific creator match
    if (currentUser) {
      // Use currentUser name even if firstName is undefined
      const firstName = currentUser.firstName || 'User';
      const lastName = currentUser.lastName || '';
      return lastName ? `${firstName} ${lastName}` : firstName;
    }
    
    // Fourth priority: Try to use email or ID from currentUser
    if (currentUser) {
      const user = currentUser as any;
      if (user.email) {
        const emailName = user.email.split('@')[0];
        return emailName;
      } else if (user.id) {
        const idName = `User ${user.id.slice(-4)}`;
        return idName;
      }
    }
    
    // Fifth priority: Try to use memory.creator if available
    if (memory.creator && memory.creator.firstName) {
      const firstName = memory.creator.firstName.trim();
      const lastName = memory.creator.lastName && memory.creator.lastName.trim() ? memory.creator.lastName.trim() : '';
      return lastName ? `${firstName} ${lastName}` : firstName;
    }
    
    // Last fallback: Generic name
    return 'Người dùng';
  };

  const renderTags = () => {
    if (!memory.tags || memory.tags.length === 0) return null;
    
    return (
      <View style={styles.tagsContainer}>
        {memory.tags.map((tag: string) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar uri={creator?.avatar || (currentUser as any)?.avatar} size={36} style={styles.profilePicture} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{getCreatorName()}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(memory.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {/* Visibility toggle - Only show for owner */}
          {isOwner && memory.visibility && (
            <VisibilityToggle
              visibility={memory.visibility}
              onUpdate={handleVisibilityUpdate}
              size="small"
            />
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {memory.title}
        </Text>
        
        <Text style={styles.description} numberOfLines={3}>
          {memory.content}
        </Text>

        {/* Tags */}
        {renderTags()}

        {/* Media Preview */}
        {memory.attachments && memory.attachments.length > 0 && (
          <View style={styles.mediaSection}>
            <MemoryMediaViewer attachments={memory.attachments} maxPreviewCount={3} />
          </View>
        )}
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        <View style={styles.leftActions}>
          <ReactionBar
            targetType="Memory"
            targetId={memory.id}
            onReactionChange={() => onLike?.(memory)}
          />
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCommentPress}
          >
            <MaterialIcons name="chat-bubble-outline" size={20} color="#666" />
            <Text style={styles.actionText}>
              {(() => {
                const text = commentCount > 0 ? `${commentCount} bình luận` : 'Bình luận';
                return text;
              })()}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.rightActions}>
          {(onEdit || onDelete) && isOwner && (
            <View style={styles.memoryActions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButtonIcon}
                  onPress={() => onEdit(memory)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons name="edit" size={16} color="#4f8cff" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButtonIcon}
                  onPress={() => onDelete(memory)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons name="delete" size={16} color="#ff4757" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Comment Modal */}
      <CommentModal
        visible={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        targetType="memory"
        targetId={memory.id}
        onCommentAdded={(comment) => {
          // Update comment count when comment is added
          setCommentCount(prev => prev + 1);
        }}
        onCommentDeleted={(commentId) => {
          // Update comment count when comment is deleted
          setCommentCount(prev => Math.max(0, prev - 1));
        }}
        onCommentEdited={(comment) => {
          // Comment edited successfully
        }}
      />
      

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePicture: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  tagText: {
    fontSize: 12,
    color: '#4f8cff',
    fontWeight: '600',
  },
  mediaSection: {
    marginTop: 8,
  },
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  memoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonIcon: {
    padding: 8,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    maxHeight: 400,
  },
}); 