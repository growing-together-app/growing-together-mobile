import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { commentService } from '../../services/commentService';
import CommentSystem, { CommentModal } from '../CommentSystem';
import { DeleteButton, EditButton } from '../ui/EditDeleteButtons';
import ReactionBar from '../ui/ReactionBar';

export type HealthRecordType = 'growth' | 'vaccine' | 'illness';

interface HealthRecordItemProps {
  type: HealthRecordType;
  date: string;
  value: string;
  note?: string;
  id?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLike?: () => void;
  onComment?: () => void;
}

const HealthRecordItem: React.FC<HealthRecordItemProps> = ({ 
  type, 
  date, 
  value, 
  note,
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
        const apiResponse = await commentService.getComments('healthRecord', id, 1, 1);
        
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
  }, [id]);

  const getTypeIcon = () => {
    switch (type) {
      case 'growth':
        return 'trending-up';
      case 'vaccine':
        return 'medical-services';
      case 'illness':
        return 'healing';
      default:
        return 'medical-services';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'growth':
        return '#4caf50';
      case 'vaccine':
        return '#2196f3';
      case 'illness':
        return '#ff9800';
      default:
        return '#4caf50';
    }
  };

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
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor() }]}>
          <MaterialIcons name={getTypeIcon() as any} size={16} color="#fff" />
          <Text style={styles.typeText}>{type.toUpperCase()}</Text>
        </View>
        <Text style={styles.date}>{formatDate(date)}</Text>
      </View>

      {/* Content */}
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.value}>{value}</Text>
        {note && <Text style={styles.note}>{note}</Text>}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          {id && (
            <ReactionBar
              targetType="HealthRecord"
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
            targetType="healthRecord"
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
          targetType="healthRecord"
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
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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

export default HealthRecordItem; 