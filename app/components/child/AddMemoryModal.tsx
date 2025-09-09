import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { createMemory } from '../../redux/slices/memorySlice';
import authService from '../../services/authService';
import { CreateMemoryData } from '../../services/memoryService';
import { conditionalLog } from '../../utils/logUtils';
import AddButton from '../ui/AddButton';
import VisibilityToggle, { VisibilityType } from '../ui/VisibilityToggle';

interface AddMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  childId: string;
}

interface SelectedFile {
  uri: string;
  type: string;
  name: string;
  size: number;
}

export default function AddMemoryModal({ visible, onClose, childId }: AddMemoryModalProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { children } = useAppSelector((state) => state.children);
  conditionalLog.memoryUI('AddMemoryModal: Component starting to render');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [visibility, setVisibility] = useState<VisibilityType>('private');
  
  // Check if current user is the creator (owner of the child)
  const isCreator = currentUser && childId && 
    children && children.some(child => child.id === childId);

  // Load default visibility when modal opens
  useEffect(() => {
    if (visible) {
      const loadDefaultVisibility = async () => {
        try {
          const savedVisibility = await AsyncStorage.getItem('defaultVisibility');
          if (savedVisibility && (savedVisibility === 'private' || savedVisibility === 'public')) {
            setVisibility(savedVisibility as VisibilityType);
          }
        } catch (error) {
          console.error('Failed to load default visibility:', error);
        }
      };
      
      loadDefaultVisibility();
    }
  }, [visible]);

  // Clear any existing memory errors when modal opens
  useEffect(() => {
    if (visible) {
      conditionalLog.memoryUI('AddMemoryModal: Would clear errors here');
      // clearErrors(); // uncomment when error handling is implemented
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
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image',
          name: asset.fileName || `file_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          size: asset.fileSize || 0,
        }));

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

  const handleSubmit = async () => {
    conditionalLog.memoryUI('=== HANDLE SUBMIT CALLED ===');
    conditionalLog.memoryUI('Form data:', { title: title.trim(), content: content.trim(), childId });
    
    // Basic validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    conditionalLog.memoryUI('=== STARTING MEMORY CREATION ===');

    try {
      setLoading(true);

      // Check authentication first
      const token = await authService.getAccessToken();
      const isAuthenticated = await authService.isAuthenticated();
      
      conditionalLog.memoryUI('Authentication check:');
      conditionalLog.memoryUI('- Token present:', token ? 'Yes' : 'No');
      conditionalLog.memoryUI('- Token length:', token ? token.length : 0);
      conditionalLog.memoryUI('- Is authenticated:', isAuthenticated);
      conditionalLog.memoryUI('- User:', authService.getCurrentUser()?.email || 'No user');

      if (!isAuthenticated || !token) {
        Alert.alert('Error', 'Authentication required. Please log in again.');
        return;
      }

      const memoryData: CreateMemoryData = {
        title: title.trim(),
        content: content.trim(),
        childId,
        date: new Date().toISOString().split('T')[0], // Use date only (YYYY-MM-DD format)
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : [],
        visibility: visibility, // Use the visibility state
        attachments: selectedFiles.length > 0 ? selectedFiles.map(file => {
          // Validate file has required properties
          if (!file.uri || !file.name) {
            conditionalLog.memoryUI('Skipping invalid file:', file);
            return null;
          }
          
          // Determine proper MIME type based on file extension and type
          let mimeType = 'image/jpeg'; // default
          if (file.type === 'video') {
            mimeType = 'video/mp4';
          } else if (file.name) {
            const extension = file.name.toLowerCase().split('.').pop();
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
              default:
                mimeType = 'image/jpeg';
            }
          }
          
          return {
            uri: file.uri,
            type: mimeType,
            name: file.name,
            size: file.size || 0,
          } as any;
        }).filter(Boolean) : undefined,
      };

      // Dispatch the action to create memory
      await dispatch(createMemory(memoryData)).unwrap();
      
      conditionalLog.memoryUI('AddMemoryModal: Memory created successfully:', memoryData);

      // Reset form and close modal on success
      setTitle('');
      setContent('');
      setTags('');
      setSelectedFiles([]);
      onClose();

      Alert.alert('Success', 'Memory created successfully!');

    } catch (error: any) {
      conditionalLog.memoryUI('Memory creation error:', error);
      conditionalLog.memoryUI('Error type:', typeof error);
      conditionalLog.memoryUI('Error status:', error?.status);
      conditionalLog.memoryUI('Error message:', error?.message);
      conditionalLog.memoryUI('Full error object:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
      Alert.alert('Error', `Failed to create memory: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim() || tags.trim() || selectedFiles.length > 0) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setTitle('');
              setContent('');
              setTags('');
              setSelectedFiles([]);
              onClose();
            },
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
        <Text style={styles.label}>Selected Files ({selectedFiles.length}/5)</Text>
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
                  name={file.type === 'video' ? 'videocam' : 'photo'} 
                  size={12} 
                  color="#fff" 
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

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
          <Text style={styles.title}>Add Memory</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            style={[
              styles.saveButton,
              (!title.trim() || !content.trim()) && styles.saveButtonDisabled,
            ]}
          >
            <Text style={[
              styles.saveText,
              (!title.trim() || !content.trim()) && styles.saveTextDisabled,
            ]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
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
            <AddButton
              title={selectedFiles.length >= 5 ? 'Max files reached' : 'Add Photos/Videos'}
              onPress={pickImages}
              variant="primary"
              iconSize={24}
              disabled={selectedFiles.length >= 5}
              iconName="add-photo-alternate"
            />
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
  bottomPadding: {
    height: 100,
  },
}); 