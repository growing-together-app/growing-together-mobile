import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateHealthRecord } from '../../redux/slices/healthSlice';
import { commentService } from '../../services/commentService';
import { HealthRecord } from '../../types/health';
import { CommentModal } from '../CommentSystem';
import { DeleteButton, EditButton } from '../ui/EditDeleteButtons';
import ReactionBar from '../ui/ReactionBar';
import VisibilityToggle from '../ui/VisibilityToggle';

interface HealthRecordItemProps {
  record: HealthRecord;
  onEdit?: (record: HealthRecord) => void;
  onDelete?: (recordId: string) => void;
  isLast?: boolean;
}

const HealthRecordItem: React.FC<HealthRecordItemProps> = ({ 
  record, 
  onEdit, 
  onDelete,
  isLast = false
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { children } = useAppSelector((state) => state.children);
  
  // Check if current user is the owner of the child (not just a member)
  // Only the owner can see visibility toggle
  const getChildId = (childId: any) => {
    if (typeof childId === 'string') return childId;
    if (childId && typeof childId === 'object' && childId._id) return childId._id;
    if (childId && typeof childId === 'object' && childId.id) return childId.id;
    return null;
  };
  
  const recordChildId = getChildId(record?.childId);
  
  // Helper function to get parentId from child
  const getParentId = (parentId: any) => {
    if (typeof parentId === 'string') return parentId;
    if (parentId && typeof parentId === 'object' && parentId._id) return parentId._id;
    if (parentId && typeof parentId === 'object' && parentId.id) return parentId.id;
    return null;
  };
  
  const isOwner = currentUser && record && recordChildId && 
    children && children.some(child => {
      const childId = child.id;
      const childParentId = getParentId(child.parentId);
      const currentUserId = currentUser.id;
      
      return childId === recordChildId && childParentId === currentUserId;
    });
  

  
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const handleVisibilityUpdate = async (newVisibility: 'private' | 'public') => {
    try {
      const result = await dispatch(updateHealthRecord({
        recordId: record.id,
        data: { visibility: newVisibility }
      })).unwrap();
      
      // Success - no alert needed, toggle switch provides visual feedback
    } catch (error) {
      throw error; // Re-throw to let VisibilityToggle handle the error
    }
  };

  const handleMediaPress = (mediaUrl: string) => {
    setSelectedMedia(mediaUrl);
    setShowMediaModal(true);
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMedia(null);
  };

  const handleCommentPress = () => {
    setShowCommentModal(true);
  };

  // Fetch comment count
  useEffect(() => {
    if (!record?.id) return;
    
    const fetchCommentCount = async () => {
      try {
        const apiResponse = await commentService.getComments('healthRecord', record.id, 1, 1);
        
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
  }, [record?.id]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination':
        return 'vaccines';
      case 'medication':
        return 'medication';
      case 'illness':
        return 'sick';
      default:
        return 'healing';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vaccination':
        return '#10B981'; // Green
      case 'medication':
        return '#3B82F6'; // Blue
      case 'illness':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const formatDate = (dateString: string) => {
    
    try {
      // Handle empty or null dates
      if (!dateString || dateString.trim() === '') {
        return 'No Date';
      }
      
      // Try to parse different date formats
      let date: Date;
      
      // If it's already a valid ISO string, use it directly
      if (dateString.includes('T') || dateString.includes('Z')) {
        date = new Date(dateString);
      } else {
        // Try to parse as YYYY-MM-DD format
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          // Try direct parsing
          date = new Date(dateString);
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      
      return formatted;
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDateRange = () => {
    const startDate = formatDate(record.startDate);
    if (record.endDate) {
      const endDate = formatDate(record.endDate);
      return `${startDate} - ${endDate}`;
    }
    return startDate;
  };

  const getAttachmentIcon = (attachmentUrl: string) => {
    if (!attachmentUrl || typeof attachmentUrl !== 'string') {
      return 'attachment';
    }
    const extension = attachmentUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      case 'pdf':
        return 'picture-as-pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video-library';
      case 'mp3':
      case 'wav':
      case 'm4a':
        return 'audiotrack';
      default:
        return 'attachment';
    }
  };

  const getAttachmentColor = (attachmentUrl: string) => {
    if (!attachmentUrl || typeof attachmentUrl !== 'string') {
      return '#6B7280'; // Gray for undefined/null
    }
    const extension = attachmentUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '#10B981'; // Green for images
      case 'pdf':
        return '#EF4444'; // Red for PDFs
      case 'doc':
      case 'docx':
        return '#3B82F6'; // Blue for documents
      case 'mp4':
      case 'mov':
      case 'avi':
        return '#8B5CF6'; // Purple for videos
      case 'mp3':
      case 'wav':
      case 'm4a':
        return '#F59E0B'; // Orange for audio
      default:
        return '#6B7280'; // Gray for others
    }
  };

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isVideoFile = (url: string) => {
    return /\.(mp4|mov|avi|mkv|webm)$/i.test(url);
  };

  return (
    <View style={styles.container}>
      {/* Timeline line */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineDot}>
          <MaterialIcons 
            name={getTypeIcon(record.type)} 
            size={16} 
            color="white" 
          />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <View 
              style={[
                styles.typeBadge, 
                { backgroundColor: getTypeColor(record.type) }
              ]}
            >
              <Text style={styles.typeText}>
                {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
              </Text>
            </View>
            
            {/* Visibility Controls */}
            {isOwner && (
              <VisibilityToggle
                visibility={record.visibility || 'private'}
                onUpdate={handleVisibilityUpdate}
                size="small"
              />
            )}
          </View>
          {/* Action buttons */}
          {(onEdit || onDelete) && isOwner && (
            <View style={styles.actionButtons}>
              {onEdit && (
                <EditButton onPress={() => onEdit(record)} />
              )}
              {onDelete && (
                <DeleteButton onPress={() => onDelete(record.id)} />
              )}
            </View>
          )}
        </View>

        <Text style={styles.title}>{record.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {record.description}
        </Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.metaText}>{formatDateRange()}</Text>
          </View>
          
          {record.doctorName && (
            <View style={styles.metaItem}>
              <MaterialIcons name="person" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.metaText}>{record.doctorName}</Text>
            </View>
          )}
          
          {record.location && (
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.metaText}>{record.location}</Text>
            </View>
          )}
        </View>

        {record.attachments && record.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.attachmentsLabel}>
              Attachments ({record.attachments.length})
            </Text>
            <View style={styles.attachmentsList}>
              {(() => {
                const validAttachments = (record.attachments || [])
                  .slice(0, 3)
                  .filter(att => !!att && typeof (att as any).url === 'string' && (att as any).url.trim() !== '');
                
                if (validAttachments.length === 0) {
                  return (
                    <View style={styles.attachmentItem}>
                      <MaterialIcons name="attachment" size={16} color="#6B7280" />
                      <Text style={styles.attachmentText}>No valid attachments</Text>
                    </View>
                  );
                }
                
                return validAttachments.map((attachment, index) => {
                  const attachmentUrl: string = (attachment as any).url;
                  const isImage = isImageFile(attachmentUrl);
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.attachmentItem}
                      onPress={() => handleMediaPress(attachmentUrl)}
                    >
                      {isImage ? (
                        <View style={styles.imageThumbnail}>
                          <MaterialIcons name="image" size={16} color={getAttachmentColor(attachmentUrl)} />
                        </View>
                      ) : (
                        <MaterialIcons 
                          name={getAttachmentIcon(attachmentUrl)} 
                          size={16} 
                          color={getAttachmentColor(attachmentUrl)} 
                        />
                      )}
                    </TouchableOpacity>
                  );
                });
              })()}
              {record.attachments.length > 3 && (
                <Text style={styles.attachmentsMore}>
                  +{record.attachments.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Reaction bar */}
        {record?.id && (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ReactionBar targetType={'HealthRecord'} targetId={record.id} />
            <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
              <MaterialIcons name="chat-bubble-outline" size={24} color="#1877F2" />
              <Text style={styles.actionText}>
                {commentCount > 0 ? `${commentCount} bình luận` : 'Bình luận'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Media Preview Modal */}
      <Modal
        visible={showMediaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMediaModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeMediaModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {selectedMedia && isImageFile(selectedMedia) && (
                <Image
                  source={{ uri: selectedMedia }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              
              {selectedMedia && isVideoFile(selectedMedia) && (
                <View style={styles.videoContainer}>
                  <MaterialIcons name="video-library" size={48} color={Colors.light.textSecondary} />
                  <Text style={styles.videoText}>Video preview not available</Text>
                  <Text style={styles.videoUrl}>{selectedMedia}</Text>
                </View>
              )}
              
              {selectedMedia && !isImageFile(selectedMedia) && !isVideoFile(selectedMedia) && (
                <View style={styles.fileContainer}>
                  <MaterialIcons name="attachment" size={48} color={Colors.light.textSecondary} />
                  <Text style={styles.fileText}>File preview not available</Text>
                  <Text style={styles.fileUrl}>{selectedMedia}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comment Modal */}
      {record?.id && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          targetType="healthRecord"
          targetId={record.id}
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
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    height: 60,
    backgroundColor: Colors.light.card,
    marginTop: 8,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  typeContainer: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaContainer: {
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
  attachmentsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.card,
    paddingTop: 12,
  },
  attachmentsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  attachmentsList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachmentsMore: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  imageThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewImage: {
    width: Dimensions.get('window').width - 32,
    height: Dimensions.get('window').height * 0.7,
  },
  videoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  videoText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  videoUrl: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  fileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  fileText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  fileUrl: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#1877F2',
    marginLeft: 4,
  },
});

export default HealthRecordItem; 