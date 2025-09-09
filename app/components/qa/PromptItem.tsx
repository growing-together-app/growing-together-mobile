import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Prompt } from '../../services/promptService';
import AddButton from '../ui/AddButton';

interface PromptItemProps {
  prompt: Prompt;
  onPress: () => void;
  onAddResponse: () => void;
  hasResponse: boolean;
}

export default function PromptItem({ prompt, onPress, onAddResponse, hasResponse }: PromptItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {prompt.title}
            </Text>
            {prompt.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{prompt.category}</Text>
              </View>
            )}
          </View>
          <View style={styles.statusContainer}>
            {hasResponse ? (
              <View style={styles.answeredBadge}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.answeredText}>Answered</Text>
              </View>
            ) : (
              <View style={styles.unansweredBadge}>
                <MaterialIcons name="help-outline" size={16} color="#FF9800" />
                <Text style={styles.unansweredText}>Unanswered</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.promptContent} numberOfLines={3}>
          {prompt.content}
        </Text>
        
        {prompt.tags && prompt.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {prompt.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            {prompt.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{prompt.tags.length - 3} more</Text>
            )}
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.dateText}>
            Added {formatDate(prompt.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
      
      {!hasResponse && (
        <AddButton
          title="Answer"
          onPress={onAddResponse}
          variant="secondary"
          iconSize={20}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#4f8cff',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  answeredText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 4,
  },
  unansweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unansweredText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginLeft: 4,
  },
  promptContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'center',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },

}); 