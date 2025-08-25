import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as familyService from '../../services/familyService';
import LoadingSpinner from '../ui/LoadingSpinner';

interface RemoveMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: {
    id: string;
    userId: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    };
    role: string;
  };
  groupId: string;
  groupName: string;
  currentUserRole: string;
}

export default function RemoveMemberModal({
  visible,
  onClose,
  onSuccess,
  member,
  groupId,
  groupName,
  currentUserRole,
}: RemoveMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemoveMember = async () => {
    if (!member || !member.id) {
      Alert.alert('Error', 'Invalid member data');
      return;
    }



    setIsSubmitting(true);
    try {
      // Try using userId instead of member.id - backend might expect user ID
      const memberIdToUse = member.userId || member.id;
      await familyService.removeMemberFromFamilyGroup(groupId, memberIdToUse);
      Alert.alert(
        'Success',
        `${member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Member'} has been removed from the group.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Remove member error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove member';
      console.error('Detailed error:', JSON.stringify(error, null, 2));
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const memberName = member.user 
    ? `${member.user.firstName} ${member.user.lastName}`
    : 'Unknown Member';

  const isOwner = member.role === 'owner';
  const isCurrentUser = member.user?.id === currentUserRole; // This should be current user ID

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <MaterialIcons name="warning" size={32} color="#e74c3c" />
            <Text style={styles.title}>Remove Member</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              Are you sure you want to remove{' '}
              <Text style={styles.memberName}>{memberName}</Text>
              {' '}from <Text style={styles.groupName}>{groupName}</Text>?
            </Text>

            {isOwner && (
              <View style={styles.warningContainer}>
                <MaterialIcons name="info" size={20} color="#f39c12" />
                <Text style={styles.warningText}>
                  This member is the group owner. Removing them will transfer ownership to another member or delete the group.
                </Text>
              </View>
            )}

            <Text style={styles.note}>
              This action cannot be undone. The member will lose access to all group content and will need to be re-invited to rejoin.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.removeButton]}
              onPress={handleRemoveMember}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoadingSpinner size="small" color="#fff" />
              ) : (
                <Text style={styles.removeButtonText}>Remove</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  content: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  memberName: {
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  groupName: {
    fontWeight: 'bold',
    color: '#4f8cff',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  note: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 