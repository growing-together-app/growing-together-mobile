import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { commentService } from '../../services/commentService';
import CommentSystem, { CommentModal } from '../CommentSystem';
import { DeleteButton, EditButton } from '../ui/EditDeleteButtons';
import ReactionBar from '../ui/ReactionBar';

export type QAMemoryType = 'text' | 'image' | 'audio' | 'video';

interface QAMemoryItemProps {
  type: QAMemoryType;
  question: string;
  answer: string;
  mediaUrl?: string;
  date: string;
  id?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLike?: () => void;
  onComment?: () => void;
}

const QAMemoryItem: React.FC<QAMemoryItemProps> = ({ 
  type, 
  question, 
  answer, 
  mediaUrl, 
  date,
  id,
  onPress,
  onEdit,
  onDelete,
  onLike,
  onComment
}) => {
  const [showComments, setShowComments] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const handleCommentPress = () => {
    setShowCommentModal(true);
    onComment?.();
  };

  // Fetch comment count
  useEffect(() => {
    if (!id) return;
    
    const fetchCommentCount = async () => {
      try {
        const response = await commentService.getComments('promptResponse', id, 1, 1);
        
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
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Vừa xong';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} giờ trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <MaterialIcons name="help" size={16} color="#fff" />
          <Text style={styles.typeText}>Q&A</Text>
        </View>
        <Text style={styles.date}>{formatDate(date)}</Text>
      </View>

      {/* Content */}
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        {/* Question Section */}
        <View style={styles.questionSection}>
          <View style={styles.questionHeader}>
            <MaterialIcons name="help-outline" size={20} color="#ff9800" />
            <Text style={styles.questionLabel}>Question</Text>
          </View>
          <Text style={styles.questionText} numberOfLines={3}>
            {question}
          </Text>
        </View>

        {/* Answer Section */}
        <View style={styles.answerSection}>
          <View style={styles.answerHeader}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#2196F3" />
            <Text style={styles.answerLabel}>Answer</Text>
          </View>
          <Text style={styles.answerText} numberOfLines={4}>
            {answer}
          </Text>
        </View>

        {/* Media */}
        {type === 'image' && mediaUrl && (
          <View style={styles.mediaContainer}>
            <Image source={{ uri: mediaUrl }} style={styles.media} />
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          {id && (
            <ReactionBar
              targetType="PromptResponse"
              targetId={id}
              onReactionChange={() => onLike?.()}
            />
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
            <MaterialIcons name="chat-bubble-outline" size={24} color="#1877F2" />
            <Text style={styles.actionText}>
              {commentCount > 0 ? `${commentCount} bình luận` : 'Bình luận'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.rightActions}>
          {onEdit && (
            <EditButton onPress={onEdit} />
          )}
          {onDelete && (
            <DeleteButton onPress={onDelete} />
          )}
        </View>
      </View>

      {/* Comments Section */}
      {showComments && id && (
        <View style={styles.commentsSection}>
          <CommentSystem
            targetType="promptResponse"
            targetId={id}
            mode="inline"
            maxHeight={500}
            useScrollView={true}
            onCommentAdded={(comment) => {
              // Comment added successfully
            }}
            onCommentDeleted={(commentId) => {
              // Comment deleted successfully
            }}
            onCommentEdited={(comment) => {
              // Comment edited successfully
            }}
          />
        </View>
      )}

      {/* Comment Modal */}
      {id && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          targetType="promptResponse"
          targetId={id}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    color: '#ff9800',
    marginLeft: 8,
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 8,
    color: '#333',
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
    color: '#2196F3',
    marginLeft: 8,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  mediaContainer: {
    marginTop: 8,
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    maxHeight: 400,
  },
});

export default QAMemoryItem; 