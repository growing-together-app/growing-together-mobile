import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { deleteResponse, fetchChildResponses } from '../../redux/slices/promptResponseSlice';
import { fetchPrompts } from '../../redux/slices/promptSlice';
import { Prompt } from '../../services/promptService';
import ErrorView from '../ui/ErrorView';
import LoadingSpinner from '../ui/LoadingSpinner';
import AddResponseModal from './AddResponseModal';
import AskChildModal from './AskChildModal';
import EditResponseModal from './EditResponseModal';
import QuestionAnswerCard from './QuestionAnswerCard';

interface QAContentProps {
  childId: string;
  useScrollView?: boolean; // New prop to handle nesting issue
  editingItem?: any; // Item to be edited from timeline
}

type ListItemType = 'header' | 'qa-card' | 'ask-button' | 'load-more';

interface ListItem {
  type: ListItemType;
  data?: any;
  prompt?: Prompt;
  response?: any;
}

export default function QAContent({ childId, useScrollView = false, editingItem }: QAContentProps) {
  // Debug: Log the childId value
  // console.log('QAContent: Received childId:', childId);
  // console.log('QAContent: childId type:', typeof childId);
  // console.log('QAContent: childId length:', childId?.length);
  
  const dispatch = useAppDispatch();
  const { prompts, loading: promptsLoading, error: promptsError, hasMore: promptsHasMore } = useAppSelector((state) => state.prompts);
  const { responses, loading: responsesLoading, error: responsesError, hasMore: responsesHasMore, deletingResponseId } = useAppSelector((state) => state.promptResponses);
  const { currentChild } = useAppSelector((state) => state.children);
  
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showAddResponseModal, setShowAddResponseModal] = useState(false);
  const [showEditResponseModal, setShowEditResponseModal] = useState(false);
  const [showAskChildModal, setShowAskChildModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [visibleCardsCount, setVisibleCardsCount] = useState(3); // Show 3 cards initially
  
  // Use ref to track if initial data has been loaded
  const initialDataLoaded = useRef(false);

  // Function to close all modals
  const closeAllModals = () => {
    setSelectedPrompt(null);
    setSelectedResponse(null);
    setShowAskChildModal(false);
  };

  // Load prompts and responses on mount
  useEffect(() => {
    if (childId && !initialDataLoaded.current) {
      // console.log('QAContent: Loading initial data for childId:', childId);
      initialDataLoaded.current = true;
      // Temporarily disable API calls
      dispatch(fetchPrompts({ isActive: true, limit: 20 }));
      dispatch(fetchChildResponses({ childId, limit: 20 }));
    }
  }, [childId, dispatch]);

  // Debug effect to log state changes
  useEffect(() => {
    // console.log('QAContent: State updated - prompts:', prompts.length, 'responses:', responses.length);
  }, [prompts.length, responses.length]);

  // Debug modal states
  useEffect(() => {
    // console.log('QAContent: Modal states - Prompt:', selectedPrompt, 'Response:', selectedResponse, 'AskChild:', showAskChildModal);
  }, [selectedPrompt, selectedResponse, showAskChildModal]);

  // Handle editing item from timeline
  useEffect(() => {
    if (editingItem && editingItem.id) {
      // console.log('QAContent: Received editing item from timeline:', editingItem);
      setSelectedResponse(editingItem);
      setShowEditResponseModal(true);
    }
  }, [editingItem]);

  // Reset the ref when childId changes and clear data
  useEffect(() => {
    initialDataLoaded.current = false;
    setVisibleCardsCount(3); // Reset to show 3 cards initially

  }, [childId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadMoreDataRef.current) {
        clearTimeout(loadMoreDataRef.current);
      }
      // Clean up modal states on unmount
      setSelectedPrompt(null);
      setSelectedResponse(null);
      setShowAskChildModal(false);
    };
  }, []);

  const handlePromptPress = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };

  const handleAddResponse = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setShowAddResponseModal(true);
  };

  const handleEditResponse = (response: any) => {
    setSelectedResponse(response);
    setShowEditResponseModal(true);
  };

  const handleDeleteResponse = async (response: any) => {
    Alert.alert(
      "Delete Response",
      "Are you sure you want to delete this response? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteResponse(response.id)).unwrap();
              // Refresh the responses after deletion
              dispatch(fetchChildResponses({ childId, limit: 20 }));
              Alert.alert("Success", "Response deleted successfully!");
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete response. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleAskChild = () => {
    setShowAskChildModal(true);
  };

  const handleAskChildSave = (question: Prompt | string, answer: string, attachment?: string) => {
    // Refresh data after a short delay to ensure backend has processed the request
    setTimeout(() => {
      dispatch(fetchPrompts({ isActive: true, limit: 20 }));
      dispatch(fetchChildResponses({ childId, limit: 20 }));
    }, 1000); // 1 second delay
    
    setShowAskChildModal(false);
  };

  const handleResponseCreated = () => {
    // Refresh data after a short delay to ensure backend has processed the request
    setTimeout(() => {
      dispatch(fetchChildResponses({ childId, limit: 20 }));
    }, 1000); // 1 second delay
  };

  const handleResponseUpdated = () => {
    // Refresh data after a short delay to ensure backend has processed the request
    setTimeout(() => {
      dispatch(fetchChildResponses({ childId, limit: 20 }));
    }, 1000); // 1 second delay
  };

  const handleLoadMore = () => {
    setVisibleCardsCount(prev => prev + 3); // Load 3 more cards

  };

  // Debounce mechanism for loadMoreData
  const loadMoreDataRef = useRef<NodeJS.Timeout | null>(null);

  const loadMoreData = useCallback(() => {

    // Clear any existing timeout
    if (loadMoreDataRef.current) {
      clearTimeout(loadMoreDataRef.current);
    }

    // Debounce the load more operation
    loadMoreDataRef.current = setTimeout(() => {
      // Prevent multiple simultaneous requests
      if (promptsLoading || responsesLoading) {
        return;
      }

      // Load more prompts if available
      if (promptsHasMore && prompts.length > 0) {
        const nextPage = Math.floor(prompts.length / 20) + 1;
        dispatch(fetchPrompts({ isActive: true, limit: 20, page: nextPage }));
      }

      // Load more responses if available
      if (responsesHasMore && responses.length > 0) {
        const nextPage = Math.floor(responses.length / 20) + 1;
        dispatch(fetchChildResponses({ childId, limit: 20, page: nextPage }));
      }
    }, 300); // 300ms debounce
  }, [promptsLoading, responsesLoading, promptsHasMore, responsesHasMore, prompts.length, responses.length, childId, dispatch]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.header}>
            <Text style={styles.title}>Questions & Answers</Text>
            <Text style={styles.subtitle}>
              View your child&apos;s answered questions and responses with media
            </Text>
          </View>
        );
      
      case 'ask-button':
        return (
          <TouchableOpacity
            style={styles.askButton}
            onPress={handleAskChild}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.askButtonText}>Ask Your Child</Text>
          </TouchableOpacity>
        );
      
      case 'qa-card':
        return (
          <QuestionAnswerCard
            prompt={item.prompt!}
            response={item.response}
            onPress={() => item.prompt && handlePromptPress(item.prompt)}
            onAddResponse={() => item.prompt && handleAddResponse(item.prompt)}
            onEditResponse={() => item.response && handleEditResponse(item.response)}
            onDeleteResponse={() => item.response && handleDeleteResponse(item.response)}
            showAddButton={true}
            isDeleting={deletingResponseId === item.response?.id}
          />
        );
      
      case 'load-more':
        return (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={handleLoadMore}
            activeOpacity={0.8}
          >
            <MaterialIcons name="expand-more" size={24} color="#007AFF" />
            <Text style={styles.loadMoreButtonText}>Load More</Text>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  if (promptsLoading && prompts.length === 0) {
    return <LoadingSpinner message="Loading Q&A content..." />;
  }

  if (promptsError) {
    return (
      <ErrorView 
        message={promptsError} 
        onRetry={() => {
          if (childId) {
            dispatch(fetchPrompts({ isActive: true, limit: 20 }));
            dispatch(fetchChildResponses({ childId, limit: 20 }));
          }
        }}
      />
    );
  }

  // Create list items with Q&A cards
  const listItems: ListItem[] = [
    { type: 'header' },
    { type: 'ask-button' },
  ];

  

  // Collect all Q&A cards with duplicate prevention
  const qaCards: ListItem[] = [];
  const processedResponseIds = new Set<string>();



  // Process all responses to create cards
  responses.forEach((response, index) => {
    // Skip if we've already processed this response
    if (processedResponseIds.has(response.id)) {
      return;
    }

    let promptToUse: any = null;

    if (typeof response.promptId === 'object' && response.promptId) {
      // Use embedded prompt information
      const promptId = (response.promptId as any)._id || (response.promptId as any).id;
      promptToUse = {
        id: promptId,
        title: (response.promptId as any).question || (response.promptId as any).title || '',
        content: (response.promptId as any).question || (response.promptId as any).content || '',
        category: (response.promptId as any).category || '',
        tags: (response.promptId as any).tags || [],
        isActive: (response.promptId as any).isActive !== undefined ? (response.promptId as any).isActive : true,
        createdAt: (response.promptId as any).createdAt || response.createdAt,
        updatedAt: (response.promptId as any).updatedAt || response.updatedAt,
      };

    } else if (typeof response.promptId === 'string') {
      // Try to find matching prompt
      const matchingPrompt = prompts.find(p => p.id === response.promptId);
      if (matchingPrompt) {
        promptToUse = matchingPrompt;
      } else {
        // Create a fallback prompt object
        promptToUse = {
          id: response.promptId,
          title: 'Question',
          content: 'Question',
          category: '',
          tags: [],
          isActive: true,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
        };
      }
    }

    if (promptToUse) {
      qaCards.push({
        type: 'qa-card',
        prompt: promptToUse,
        response,
      });
      processedResponseIds.add(response.id);
    }
  });

  // Sort cards by date (most recent first) and limit to visible count
  const sortedCards = qaCards.sort((a, b) => {
    const dateA = new Date(a.response?.createdAt || a.prompt?.createdAt || 0);
    const dateB = new Date(b.response?.createdAt || b.prompt?.createdAt || 0);
    return dateB.getTime() - dateA.getTime(); // Most recent first
  });

  const visibleCards = sortedCards.slice(0, visibleCardsCount);
  const hasMoreCards = sortedCards.length > visibleCardsCount;

  // Add visible cards to list items
  listItems.push(...visibleCards);

  // Add load more button if there are more cards
  if (hasMoreCards) {
    listItems.push({ type: 'load-more' });
  }

  const renderContent = () => {
    if (useScrollView) {
      // Use ScrollView when nested inside another ScrollView
      return (
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {listItems.map((item, index) => (
            <View key={renderKeyExtractor(item, index)}>
              {renderItem({ item })}
            </View>
          ))}
          {(promptsLoading || responsesLoading) && (prompts.length > 0 || responses.length > 0) && (
            <LoadingSpinner message="Loading more content..." />
          )}
        </ScrollView>
      );
    }

    // Use FlatList when not nested
    return (
      <FlatList
        data={listItems}
        renderItem={renderItem}
        keyExtractor={renderKeyExtractor}
        showsVerticalScrollIndicator={false}
        // Temporarily disable onEndReached to debug infinite loading
        // onEndReached={loadMoreData}
        // onEndReachedThreshold={0.5}
        ListFooterComponent={
          (promptsLoading || responsesLoading) && (prompts.length > 0 || responses.length > 0) ? (
            <LoadingSpinner message="Loading more content..." />
          ) : null
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="help" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No answered questions yet</Text>
            <Text style={styles.emptySubtext}>
              Use the &quot;Ask Child&quot; button to ask questions and see them appear here once answered.
            </Text>
          </View>
        )}
      />
    );
  };

  const renderKeyExtractor = (item: ListItem, index: number) => {
    switch (item.type) {
      case 'header':
        return 'header';
      case 'ask-button':
        return 'ask-button';
      case 'qa-card':
        // Use both prompt ID and response ID to ensure uniqueness
        const promptId = item.prompt?.id || 'unknown';
        const responseId = item.response?.id || index;
        return `qa-card-${promptId}-${responseId}-${index}`;
      case 'load-more':
        return 'load-more';
      default:
        return `item-${index}`;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {/* Add Response Modal */}
      {selectedPrompt && (
        <AddResponseModal
          visible={showAddResponseModal}
          prompt={selectedPrompt}
          childId={childId}
          onClose={() => {
            setShowAddResponseModal(false);
            setSelectedPrompt(null);
          }}
          onSuccess={handleResponseCreated}
        />
      )}

      {/* Edit Response Modal */}
      {selectedResponse && (
        <EditResponseModal
          visible={showEditResponseModal}
          response={selectedResponse}
          onClose={() => {
            setShowEditResponseModal(false);
            setSelectedResponse(null);
          }}
          onSuccess={handleResponseUpdated}
        />
      )}

      {/* Ask Child Modal */}
      <AskChildModal
        visible={showAskChildModal}
        onClose={() => setShowAskChildModal(false)}
        onSave={handleAskChildSave}
        systemQuestions={prompts}
        childId={childId}
        childBirthdate={currentChild?.birthdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySectionText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySectionSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  askButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  loadMoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  askButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0', // A light background for the removed button
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
}); 