// QuestionDropdownModal.tsx
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchPrompts } from '../../redux/slices/promptSlice';
import { Prompt } from '../../services/promptService';

interface QuestionDropdownModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (_question: Prompt) => void;
}

export default function QuestionDropdownModal({
  visible,
  onClose,
  onSelect,
}: QuestionDropdownModalProps) {
  const dispatch = useAppDispatch();

  const {
    prompts,
    page,
    limit,
    loading,
    hasMore,
    error,
  } = useAppSelector((state) => state.prompts);

  // Debug: Log prompts when they change
  useEffect(() => {
    // console.log('QuestionDropdownModal: Prompts loaded:', prompts.length);
    // if (prompts.length > 0) {
    //   console.log('QuestionDropdownModal: First prompt:', {
    //     id: prompts[0].id,
    //     title: prompts[0].title,
    //     content: prompts[0].content,
    //     category: prompts[0].category
    //   });
    // }
  }, [prompts]);

  // Load page 1 when modal opens
  useEffect(() => {
    if (visible) {
      dispatch(fetchPrompts({ page: 1, limit: 10, isActive: true }));
    }
  }, [visible, dispatch]);

  const loadMore = () => {
    if (!loading && hasMore) {
      dispatch(fetchPrompts({ page: page + 1, limit, isActive: true }));
    }
  };

  const handleItemSelect = (item: any) => {
    onSelect(item);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={dropdownStyles.container}>
        <Text style={dropdownStyles.title}>Select a Question</Text>

        <FlatList
          data={prompts}
          keyExtractor={(item, index) => `prompt-${item.id || index}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={dropdownStyles.item}
              onPress={() => {
                handleItemSelect(item);
              }}
            >
              <Text style={dropdownStyles.itemText}>
                {item.title || item.content || 'No content available'}
              </Text>

            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
        />

        <TouchableOpacity onPress={onClose} style={dropdownStyles.cancelButton}>
          <Text style={dropdownStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}
      </View>
    </Modal>
  );
}

const dropdownStyles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  itemText: { fontSize: 16 },
  cancelButton: { marginTop: 20 },
  cancelText: { color: '#007AFF', fontSize: 16, textAlign: 'center' },

});


