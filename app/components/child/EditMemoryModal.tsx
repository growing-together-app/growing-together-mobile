import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { clearError, fetchMemories, updateMemory, updateMemoryAttachments } from '../../redux/slices/memorySlice';
import { Memory, UpdateMemoryData } from '../../services/memoryService';
import { conditionalLog } from '../../utils/logUtils';
import VisibilityToggle, { VisibilityType } from '../ui/VisibilityToggle';

interface EditMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  memory: Memory | null;
}

interface SelectedFile {
  uri: string;
  type: string;
  name: string;
  size: number;
  isNew?: boolean; // Track if this is a new file or existing
  publicId?: string; // For existing attachments
}

export default function EditMemoryModal({ visible, onClose, memory }: EditMemoryModalProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { children } = useAppSelector((state) => state.children);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('private');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  
  // Check if current user is the creator of this memory
  // We'll check if the current user is the owner of the child
  const isCreator = currentUser && memory && memory.childId && 
    children && children.some(child => child.id === memory.childId);

  // Populate form with memory data when modal opens
  useEffect(() => {
    if (visible && memory) {
      setTitle(memory.title || '');
      setContent(memory.content || '');
      setTags(memory.tags ? memory.tags.join(', ') : '');
      setVisibility(memory.visibility || 'private');
      
      // Convert existing attachments to selected files format
      if (memory.attachments) {
        const existingFiles = memory.attachments.map(attachment => {
          // Map attachment type to proper MIME type
          let mimeType = 'image/jpeg'; // default
          switch (attachment.type) {
            case 'image':
              mimeType = 'image/jpeg';
              break;
            case 'video':
              mimeType = 'video/mp4';
              break;
            case 'audio':
              mimeType = 'audio/mpeg';
              break;
            default:
              mimeType = 'image/jpeg';
          }
          
          return {
            uri: attachment.url,
            type: mimeType,
            name: attachment.filename || 'attachment',
            size: attachment.size,
            publicId: attachment.publicId, // Store the Cloudinary public ID for removal
            isNew: false, // Mark as existing file
          };
        });
        setSelectedFiles(existingFiles);
      } else {
        setSelectedFiles([]);
      }
      
      dispatch(clearError());
    }
  }, [visible, memory, dispatch]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setTitle('');
      setContent('');
      setTags('');
      setVisibility('private');
      setSelectedFiles([]);
    }
  }, [visible]);

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => {
          // Determine proper MIME type based on file extension and asset type
          let mimeType = 'image/jpeg'; // default
          if (asset.type === 'video') {
            mimeType = 'video/mp4';
          } else if (asset.fileName) {
            const extension = asset.fileName.toLowerCase().split('.').pop();
            switch (extension) {
              case 'png':
                mimeType = 'image/png';
                break;
              case 'gif':
                mimeType = 'image/gif';
                break;
              case 'mp4':
                mimeType = 'video/mp4';
                break;
              case 'mov':
                mimeType = 'video/quicktime';
                break;
              case 'm4a':
                mimeType = 'audio/mpeg';
                break;
              case 'wav':
                mimeType = 'audio/wav';
                break;
              default:
                mimeType = 'image/jpeg';
            }
          }
          
          return {
            uri: asset.uri,
            type: mimeType,
            name: asset.fileName || `file_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
            size: asset.fileSize || 0,
            isNew: true, // Mark as new file
          };
        });

        const totalFiles = selectedFiles.length + newFiles.length;
        if (totalFiles > 5) {
          Alert.alert('Too many files', 'You can only select up to 5 files total.');
          return;
        }

        setSelectedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      conditionalLog.memoryUI('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function for debugging attachment changes
  const debugAttachmentChanges = () => {
    if (!memory) return;
    
    conditionalLog.memoryUI('=== DEBUGGING ATTACHMENT CHANGES ===');
    conditionalLog.memoryUI('Original memory attachments:', memory.attachments?.map(att => ({ id: att.id, publicId: att.publicId, filename: att.filename })));
    conditionalLog.memoryUI('Selected files:', selectedFiles.map(f => ({ name: f.name, isNew: f.isNew, publicId: f.publicId })));
    
    // Calculate what would be removed
    const currentAttachmentIds = selectedFiles
      .filter(file => !file.isNew && file.publicId)
      .map(file => file.publicId);
    
    const removedAttachmentIds = memory.attachments
      ?.filter(att => !currentAttachmentIds.includes(att.id))
      .map(att => att.id) || [];
    
    conditionalLog.memoryUI('Current attachment IDs (from selectedFiles):', currentAttachmentIds);
    conditionalLog.memoryUI('Removed attachment IDs (would be deleted):', removedAttachmentIds);
    conditionalLog.memoryUI('=== END DEBUG ===');
  };



  const handleSubmit = async () => {
    if (!memory) {
      Alert.alert('Error', 'No memory to update');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the memory');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter content for the memory');
      return;
    }

    // Debug attachment state before submitting
    debugAttachmentChanges();

    setLoading(true);

    try {
      conditionalLog.memoryUI('EditMemoryModal: Starting memory update');
      
      // Validate data before sending
      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      const trimmedTags = tags.trim();
      
      // Check if we have any changes to make
      if (!trimmedTitle && !trimmedContent && !trimmedTags) {
        Alert.alert('No Changes', 'No changes detected. Please make some changes before saving.');
        return;
      }
      
      // Validate title if provided
      if (trimmedTitle && (trimmedTitle.length < 1 || trimmedTitle.length > 200)) {
        Alert.alert('Invalid Title', 'Title must be between 1 and 200 characters.');
        return;
      }
      
      // Validate content if provided
      if (trimmedContent && trimmedContent.length > 5000) {
        Alert.alert('Invalid Content', 'Content must not exceed 5000 characters.');
        return;
      }
      
      // Validate tags if provided
      if (trimmedTags) {
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tagArray.length > 10) {
          Alert.alert('Too Many Tags', 'Maximum 10 tags allowed.');
          return;
        }
        
        const invalidTags = tagArray.filter(tag => tag.length > 50);
        if (invalidTags.length > 0) {
          Alert.alert('Invalid Tags', 'Each tag must be 50 characters or less.');
          return;
        }
      }
      
      const updateData: UpdateMemoryData = {
        title: trimmedTitle || undefined, // Don't send empty strings
        content: trimmedContent || undefined, // Don't send empty strings
        date: memory.date, // Include the existing date to prevent validation errors
        tags: trimmedTags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0 && tag.length <= 50) : undefined,
        visibility: visibility, // Add visibility to update data
      };

      conditionalLog.memoryUI('EditMemoryModal: Update data:', updateData);
      conditionalLog.memoryUI('EditMemoryModal: Memory ID:', memory.id);
      conditionalLog.memoryUI('EditMemoryModal: Original memory:', {
        id: memory.id,
        title: memory.title,
        content: memory.content,
        date: memory.date,
        tags: memory.tags
      });

      // Update memory text content first
      const result = await dispatch(updateMemory({ 
        memoryId: memory.id, 
        data: updateData 
      })).unwrap();
      
      conditionalLog.memoryUI('EditMemoryModal: Update result:', result);

      // Handle attachment updates if there are changes
      const newFiles = selectedFiles.filter(file => file.isNew);
      
      // Find removed attachments: original attachments that are no longer in selectedFiles
      const currentAttachmentIds = selectedFiles
        .filter(file => !file.isNew && file.publicId)
        .map(file => file.publicId);
      
      const removedAttachmentIds = memory.attachments
        ?.filter(att => !currentAttachmentIds.includes(att.publicId))
        .map(att => att.publicId) || [];
      
      conditionalLog.memoryUI('EditMemoryModal: Attachment changes detected:', {
        newFiles: newFiles.length,
        removedAttachmentIds: removedAttachmentIds.length,
        currentAttachmentIds,
        originalAttachmentIds: memory.attachments?.map(att => att.id) || [],
        selectedFilesDetails: selectedFiles.map(f => ({ name: f.name, isNew: f.isNew, publicId: f.publicId })),
        originalAttachmentsDetails: memory.attachments?.map(att => ({ id: att.id, publicId: att.publicId, filename: att.filename })) || []
      });
      
      if (newFiles.length > 0 || removedAttachmentIds.length > 0) {
        setAttachmentLoading(true);
        try {
          conditionalLog.memoryUI('EditMemoryModal: Processing attachment changes');
          
          // Handle removed attachments first
          if (removedAttachmentIds.length > 0) {
            conditionalLog.memoryUI('EditMemoryModal: Removing', removedAttachmentIds.length, 'attachments:', removedAttachmentIds);
            conditionalLog.memoryUI('=== REMOVE OPERATION DEBUG ===');
            conditionalLog.memoryUI('Memory ID:', memory.id);
            conditionalLog.memoryUI('Original attachments:', memory.attachments?.map(att => ({ id: att.id, filename: att.filename })));
            conditionalLog.memoryUI('Current selectedFiles (non-new):', selectedFiles.filter(f => !f.isNew).map(f => ({ publicId: f.publicId, name: f.name })));
            conditionalLog.memoryUI('Attachment IDs to remove:', removedAttachmentIds);
            conditionalLog.memoryUI('Remove operation parameters:', {
              memoryId: memory.id,
              action: 'remove',
              attachmentIds: removedAttachmentIds,
              attachmentIdsType: removedAttachmentIds.map(id => typeof id),
              attachmentIdsLength: removedAttachmentIds.map(id => id?.length || 0)
            });
            conditionalLog.memoryUI('=== END REMOVE DEBUG ===');
            
            // Validate attachment IDs before sending to backend
            conditionalLog.memoryUI('=== ATTACHMENT ID VALIDATION ===');
            removedAttachmentIds.forEach((id, index) => {
              conditionalLog.memoryUI(`Attachment ID ${index} validation:`, {
                value: id,
                isString: typeof id === 'string',
                length: id?.length || 0,
                looksLikeMongoId: /^[a-f\d]{24}$/i.test(id || ''),
                looksLikeCloudinaryId: /^[a-zA-Z0-9_-]{10,}$/.test(id || ''),
                startsWithExtracted: id?.startsWith('extracted_'),
                sample: id?.substring(0, 15) + '...'
              });
            });
            conditionalLog.memoryUI('Backend expects MongoDB _id values (24-char hex strings)');
            conditionalLog.memoryUI('Backend controller filters by: attachment._id.toString()');
            conditionalLog.memoryUI('=== END ATTACHMENT ID VALIDATION ===');
            

            
            try {
              await dispatch(updateMemoryAttachments({
                memoryId: memory.id,
                attachments: [], // Empty array for remove action
                attachmentIds: removedAttachmentIds,
                action: 'remove'
              })).unwrap();
              conditionalLog.memoryUI('Successfully removed attachments');
            } catch (removeError: any) {
              conditionalLog.memoryUI('Remove attachments error:', removeError);
              conditionalLog.memoryUI('Remove error details:', {
                message: removeError.message,
                status: removeError.status,
                type: typeof removeError,
                stack: removeError.stack?.substring(0, 200)
              });
              if (!removeError.message?.includes('Please refresh to see changes')) {
                throw removeError; // Re-throw if it's not a refresh-needed error
              }
            }
          }
          
          // Handle new attachments
          if (newFiles.length > 0) {
            conditionalLog.memoryUI('EditMemoryModal: Adding', newFiles.length, 'new attachments');
            try {
              await dispatch(updateMemoryAttachments({
                memoryId: memory.id,
                attachments: newFiles.map(file => ({
                  uri: file.uri,
                  type: file.type,
                  name: file.name,
                  size: file.size
                })),
                action: 'add'
              })).unwrap();
              conditionalLog.memoryUI('Successfully added new attachments');
            } catch (addError: any) {
              conditionalLog.memoryUI('Add attachments error:', addError);
              if (!addError.message?.includes('Please refresh to see changes')) {
                throw addError; // Re-throw if it's not a refresh-needed error
              }
            }
          }
          
          conditionalLog.memoryUI('EditMemoryModal: Attachments updated successfully');
        } catch (attachmentError: any) {
          conditionalLog.memoryUI('Attachment update error:', attachmentError);
          
          // Extract error message properly
          let errorMessage = 'Unknown attachment error';
          if (attachmentError?.message) {
            errorMessage = attachmentError.message;
          } else if (attachmentError?.error) {
            errorMessage = attachmentError.error;
          } else if (typeof attachmentError === 'string') {
            errorMessage = attachmentError;
          } else if (attachmentError?.data?.message) {
            errorMessage = attachmentError.data.message;
          }
          
          // Check if this is a "refresh needed" error vs a real failure
          if (errorMessage.includes('Please refresh to see changes')) {
            conditionalLog.memoryUI('Attachment operation completed but needs refresh, continuing with success flow');
            // Don't show error, just refresh the data and continue with success
          } else {
            // Real error occurred, show warning but still continue
            Alert.alert('Warning', `Memory updated but some attachment changes may not have been applied: ${errorMessage}`);
          }
        } finally {
          setAttachmentLoading(false);
        }
      }
      
      // Always refresh the memories list to show any updates that did succeed
      if (memory.childId) {
        conditionalLog.memoryUI('Refreshing memories after update attempt');
        dispatch(fetchMemories({ childId: memory.childId }));
      }
      
      onClose();
      Alert.alert('Success', 'Memory updated successfully!');
    } catch (error: any) {
      conditionalLog.memoryUI('Memory update error:', error);
      conditionalLog.memoryUI('Memory update error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        data: error.data,
        payload: error.payload
      });
      
      let errorMessage = 'Failed to update memory';
      
      if (error?.status === 400) {
        // Try to extract specific validation errors
        if (error.data && typeof error.data === 'object') {
          const validationErrors = Object.entries(error.data)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              } else if (typeof messages === 'string') {
                return `${field}: ${messages}`;
              }
              return '';
            })
            .filter(Boolean)
            .join('\n');
          
          if (validationErrors) {
            errorMessage = `Validation errors:\n${validationErrors}`;
          } else {
            errorMessage = 'Invalid data provided. Please check your input and try again.';
          }
        } else {
          errorMessage = 'Invalid data provided. Please check your input and try again.';
        }
      } else if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.status === 403) {
        errorMessage = 'You do not have permission to update this memory.';
      } else if (error?.status === 404) {
        errorMessage = 'Memory not found. It may have been deleted.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!memory) return false;
    
    const textChanges = (
      title.trim() !== (memory.title || '') ||
      content.trim() !== (memory.content || '') ||
      tags.trim() !== (memory.tags ? memory.tags.join(', ') : '')
    );

    // Check for attachment changes
    const currentAttachmentCount = memory.attachments?.length || 0;
    const newAttachmentCount = selectedFiles.filter(file => file.isNew).length;
    const removedAttachmentCount = currentAttachmentCount - selectedFiles.filter(file => !file.isNew).length;
    
    const attachmentChanges = newAttachmentCount > 0 || removedAttachmentCount > 0;
    
    return textChanges || attachmentChanges;
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: onClose,
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <View style={styles.selectedFilesContainer}>
        <Text style={styles.label}>Attachments ({selectedFiles.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.filePreview}>
              <Image source={{ uri: file.uri }} style={styles.fileImage} />
              <TouchableOpacity
                style={styles.removeFileButton}
                onPress={() => removeFile(index)}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </TouchableOpacity>
              <View style={styles.fileTypeIndicator}>
                <MaterialIcons 
                  name={file.type.startsWith('video/') ? 'videocam' : 'photo'} 
                  size={12} 
                  color="#fff" 
                />
              </View>
              {file.isNew && (
                <View style={styles.newFileIndicator}>
                  <Text style={styles.newFileText}>NEW</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        <Text style={styles.helpText}>
          Tap the X to remove attachments. New attachments will be uploaded when you save.
        </Text>
      </View>
    );
  };

  if (!memory) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Memory</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || attachmentLoading || !title.trim() || !content.trim()}
              style={[
                styles.saveButton,
                (!title.trim() || !content.trim()) && styles.saveButtonDisabled,
              ]}
            >
              <Text style={[
                styles.saveText,
                (!title.trim() || !content.trim()) && styles.saveTextDisabled,
              ]}>
                {loading || attachmentLoading ? 'Updating...' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter memory title"
              maxLength={100}
              returnKeyType="next"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Content *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Describe this memory..."
              multiline
              numberOfLines={4}
              maxLength={500}
              returnKeyType="next"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tags (optional)</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="Enter tags separated by commas"
              maxLength={200}
              returnKeyType="done"
            />
            <Text style={styles.helpText}>
              Example: first steps, birthday, milestone
            </Text>
          </View>

          {/* Only show visibility toggle for creator */}
          {isCreator && (
            <View style={styles.formGroup}>
              <VisibilityToggle
                visibility={visibility}
                onUpdate={async (newVisibility) => setVisibility(newVisibility)}
                size="small"
              />
            </View>
          )}

          {renderSelectedFiles()}

          <View style={styles.attachmentsSection}>
            <Text style={styles.label}>Attachments</Text>
            <TouchableOpacity 
              style={styles.addAttachmentButton}
              onPress={pickImages}
              disabled={selectedFiles.length >= 5}
            >
              <MaterialIcons name="add-photo-alternate" size={24} color="#4f8cff" />
              <Text style={styles.addAttachmentText}>
                {selectedFiles.length >= 5 ? 'Maximum 5 attachments' : 'Add Photos/Videos'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helpText}>
              You can add up to 5 photos or videos to your memory
            </Text>
          </View>
          
          {/* Add extra padding at bottom for better scrolling */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4f8cff',
  },
  saveTextDisabled: {
    color: '#999',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  attachmentsSection: {
    marginTop: 20,
  },
  addAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4f8cff',
    borderRadius: 8,
    padding: 20,
    marginTop: 8,
    backgroundColor: '#f8fbff',
  },
  addAttachmentButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 20,
    marginTop: 8,
    backgroundColor: '#f8f8f8',
  },
  addAttachmentText: {
    fontSize: 16,
    color: '#4f8cff',
    marginLeft: 8,
  },
  addAttachmentTextDisabled: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  selectedFilesContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  filePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  fileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeFileButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileTypeIndicator: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newFileIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  newFileText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 100,
  },
}); 