import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateResponse } from '../../redux/slices/promptResponseSlice';
import { commentService } from '../../services/commentService';
import { Prompt, PromptResponse } from '../../services/promptService';
import { CommentModal } from '../CommentSystem';
import { DeleteButton, EditButton } from '../ui/EditDeleteButtons';
import ReactionBar from '../ui/ReactionBar';
import VisibilityToggle from '../ui/VisibilityToggle';
import QAMediaViewer from './QAMediaViewer';

interface QuestionAnswerCardProps {
  prompt: Prompt;
  response?: PromptResponse;
  onPress?: () => void;
  onAddResponse?: () => void;
  onEditResponse?: () => void;
  onDeleteResponse?: () => void;
  showAddButton?: boolean;
  isDeleting?: boolean;
}

export default function QuestionAnswerCard({
  prompt,
  response,
  onPress,
  onAddResponse,
  onEditResponse,
  onDeleteResponse,
  showAddButton = true,
  isDeleting = false,
}: QuestionAnswerCardProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { children } = useAppSelector((state) => state.children);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  // Check if current user is the owner of the child (not just a member)
  // Only the owner can see visibility toggle
  const getChildId = (childId: any) => {
    if (typeof childId === 'string') return childId;
    if (childId && typeof childId === 'object' && childId._id) return childId._id;
    if (childId && typeof childId === 'object' && childId.id) return childId.id;
    return null;
  };
  
  const responseChildId = getChildId(response?.childId);
  
  // Helper function to get parentId from child
  const getParentId = (parentId: any) => {
    if (typeof parentId === 'string') return parentId;
    if (parentId && typeof parentId === 'object' && parentId._id) return parentId._id;
    if (parentId && typeof parentId === 'object' && parentId.id) return parentId.id;
    return null;
  };
  
  const isOwner = currentUser && response && responseChildId && 
    children && children.some(child => {
      const childId = child.id;
      const childParentId = getParentId(child.parentId);
      const currentUserId = currentUser.id;
      
      return childId === responseChildId && childParentId === currentUserId;
    });
  


  const handleVisibilityUpdate = async (newVisibility: 'private' | 'public') => {
    try {
      await dispatch(updateResponse({
        responseId: response!.id,
        data: { visibility: newVisibility }
      })).unwrap();
    } catch (error) {
      throw error; // Re-throw to let VisibilityToggle handle the error
    }
  };

  const handleCommentPress = () => {
    setShowCommentModal(true);
  };

  // Fetch comment count
  useEffect(() => {
    if (!response?.id) return;
    
    const fetchCommentCount = async () => {
      try {
        const apiResponse = await commentService.getComments('promptResponse', response.id, 1, 1);
        
        // Handle nested response format from backend
        let total = 0;
        const responseData = apiResponse as any;
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
  }, [response?.id]);

  const hasResponse = !!response;
  const hasAttachments = response?.attachments && response.attachments.length > 0;

  return (
    <TouchableOpacity
      style={[styles.card, hasResponse && styles.answeredCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Question Section */}
      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <MaterialIcons
            name="help-outline"
            size={20}
            color="#FF9800"
          />
          <Text style={styles.questionLabel}>
            Question
          </Text>
        </View>
        
        <Text style={styles.questionText} numberOfLines={3}>
          {prompt.content}
        </Text>
      </View>

      {/* Answer Section - Only show if there's a response */}
      {hasResponse && (
        <View style={styles.answerSection}>
          <View style={styles.answerHeader}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#2196F3" />
            <Text style={styles.answerLabel}>Answer</Text>
          </View>
          
          <Text style={styles.answerText} numberOfLines={4}>
            {response!.content || 'No answer content'}
          </Text>

          {/* Visibility Controls - Only show for owner */}
          {isOwner && response && (
            <VisibilityToggle
              visibility={response.visibility || 'private'}
              onUpdate={handleVisibilityUpdate}
              size="small"
            />
          )}

          {/* Media Preview */}
          {hasAttachments && response?.attachments && (
            <QAMediaViewer attachments={response.attachments} />
          )}

          {/* Reaction Bar for Q&A response */}
          {response?.id && (
            <View style={styles.actionsRow}>
              <View style={styles.leftActions}>
                <ReactionBar targetType={'PromptResponse'} targetId={response.id} />
                <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
                  <MaterialIcons name="chat-bubble-outline" size={24} color="#1877F2" />
                  <Text style={styles.actionText}>
                    {commentCount > 0 ? `${commentCount} bình luận` : 'Bình luận'}
                  </Text>
                </TouchableOpacity>
              </View>
              {isOwner && (
                <View style={styles.rightActions}>
                  <EditButton onPress={onEditResponse!} />
                  <DeleteButton onPress={onDeleteResponse!} />
                </View>
              )}
            </View>
          )}

          {/* Feedback */}
          {response!.feedback && (
            <View style={styles.feedbackContainer}>
              <MaterialIcons
                name="star"
                size={16}
                color={response!.feedback.rating >= 4 ? '#FFD700' : '#ccc'}
              />
              <Text style={styles.feedbackText}>
                {response!.feedback.rating}/5 stars
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Date */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {hasResponse 
            ? `Answered ${new Date(response!.createdAt).toLocaleDateString()}`
            : `Asked ${new Date(prompt.createdAt).toLocaleDateString()}`
          }
        </Text>
      </View>

      {/* Comment Modal */}
      {response?.id && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          targetType="promptResponse"
          targetId={response.id}
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
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  answeredCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  questionSection: {
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  answerSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  answerText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  feedbackText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  editButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '45%',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '45%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#1877F2',
    fontWeight: '500',
  },
  actionButtonsInline: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

