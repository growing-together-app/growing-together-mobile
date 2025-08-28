import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AddMemoryModal from "../../components/child/AddMemoryModal";
import EditChildProfileModal from "../../components/child/EditChildProfileModal";
import EditMemoryModal from "../../components/child/EditMemoryModal";
import HealthContent from "../../components/child/HealthContent";
import MemoryItem from "../../components/child/MemoryItem";
import AppHeader from "../../components/layout/AppHeader";
import ScreenWithFooter from "../../components/layout/ScreenWithFooter";
import { QAContent } from "../../components/qa";
import EditResponseModal from "../../components/qa/EditResponseModal";
import TimelineItem from "../../components/timeline/TimelineItem";
import ErrorView from "../../components/ui/ErrorView";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ModalConfirm from "../../components/ui/ModalConfirm";
import SearchResults from "../../components/ui/SearchResults";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  clearCurrentChild,
  deleteChild,
  fetchChild,
} from "../../redux/slices/childSlice";
import {
  clearHealthData,
  deleteGrowthRecord,
  deleteHealthRecord,
  fetchGrowthRecord,
  fetchGrowthRecords,
  fetchHealthRecords,
  updateGrowthRecord,
  updateHealthRecord,
} from "../../redux/slices/healthSlice";
import {
  clearMemories,
  deleteMemory,
  fetchMemories,
  updateMemory,
} from "../../redux/slices/memorySlice";
import {
  clearResponses,
  deleteResponse,
  fetchChildResponses,
  updateResponse,
} from "../../redux/slices/promptResponseSlice";
import { clearPrompts, fetchPrompts } from "../../redux/slices/promptSlice";
import { Memory } from "../../services/memoryService";
import { SearchResult, searchService } from "../../services/searchService";

type TabType = "timeline" | "health" | "qa" | "memories" | "profile";

export default function ChildProfileScreen() {
  const params = useLocalSearchParams<{
    id: string;
    focusPost?: string;
    postType?: string;
  }>();
  
  // Safety check for params with fallback
  const id = params?.id || '';
  const focusPost = params?.focusPost || '';
  const postType = params?.postType || '';
  
  // Early return if no id
  if (!id) {
    console.log('⚠️ No child ID provided, returning early');
    return null;
  }
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { currentChild, loading, error } = useAppSelector(
    (state) => state.children
  );
  const {
    memories = [],
    loading: memoriesLoading,
    updating: memoriesUpdating,
    error: memoriesError,
    hasMore,
  } = useAppSelector((state) => state.memories);
  const { responses = [] } = useAppSelector((state) => state.promptResponses);
  const { prompts = [] } = useAppSelector((state) => state.prompts);
  const { healthRecords = [], growthRecords = [] } = useAppSelector(
    (state) => state.health
  );
  const { currentUser } = useAppSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>("memories");
  const [hasProcessedFocusPost, setHasProcessedFocusPost] = useState(false);
  const [hasScrolledToFocusPost, setHasScrolledToFocusPost] = useState(false);

  // Store layout positions for each timeline item
  const itemPositionsRef = useRef<Map<string, number>>(new Map());
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scrollRetryCount, setScrollRetryCount] = useState(0);
  const TOP_OFFSET = 80; // AppHeader height
  const MAX_SCROLL_RETRIES = 10; // Prevent infinite loop

  // Determine if the viewer is the owner (only owner should see edit/delete/visibility controls)
  const viewerIsOwner = !!(
    currentUser?.id &&
    currentChild?.parentId &&
    currentUser.id === currentChild.parentId
  );

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 200; // Height of the collapsible section (child info + tabs only)
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: "clamp",
  });

  // Scroll ref for focusing on specific post
  const scrollViewRef = useRef<ScrollView>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);

  // Edit/Delete state
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [showEditMemoryModal, setShowEditMemoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Child profile edit state
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [showDeleteChildConfirm, setShowDeleteChildConfirm] = useState(false);

  // Timeline edit state
  const [editingQAItem, setEditingQAItem] = useState<any>(null);
  const [editingHealthItem, setEditingHealthItem] = useState<any>(null);
  const [editingGrowthItem, setEditingGrowthItem] = useState<any>(null);

  // Q&A edit modal state
  const [showEditResponseModal, setShowEditResponseModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState<any>(null);

  // State for storing creator information
  const [creators, setCreators] = useState<Record<string, any>>({});
  




  // Create timeline items and filter them based on permissions
  const timelineItems = React.useMemo(() => {
    if (!id) return [];
    
    // Safety check for required data with default empty arrays
    const safeMemories = memories || [];
    const safeResponses = responses || [];
    const safeHealthRecords = healthRecords || [];
    const safeGrowthRecords = growthRecords || [];
    const safePrompts = prompts || [];
    
    // console.log('🔍 Timeline items data check:', {
    //   id,
    //   memoriesLength: safeMemories.length,
    //   responsesLength: safeResponses.length,
    //   healthRecordsLength: safeHealthRecords.length,
    //   growthRecordsLength: safeGrowthRecords.length,
    //   promptsLength: safePrompts.length
    // });



    const items: any[] = [];

    // Add memories
    const processedMemoryIds = new Set();
    safeMemories.forEach((memory) => {
      if (!processedMemoryIds.has(memory.id)) {
        processedMemoryIds.add(memory.id);

        // Extract creator info from parentId (which can be string or object)
        let creator = null;
        if (memory.parentId && typeof memory.parentId === "object") {
          creator = {
            id: memory.parentId._id || memory.parentId.id,
            firstName: memory.parentId.firstName,
            lastName: memory.parentId.lastName,
            avatar: memory.parentId.avatar,
          };
        }

        items.push({
          id: memory.id,
          type: "memory",
          title: memory.title,
          content: memory.content,
          date: memory.date,
          createdAt: memory.createdAt,
          media: memory.attachments,
          creator: creator, // Use extracted creator info
          creatorId: memory.parentId, // Store the creator ID for fallback
          visibility: memory.visibility,
          metadata: {
            visibility: memory.visibility,
            location: memory.location,
            tags: memory.tags,
          },
        });
      }
    });

    // Add Q&A responses
    const processedResponseIds = new Set();
    const filteredResponses = safeResponses.filter((response) => response.childId === id);
    
        filteredResponses.forEach(async (response) => {
      if (!processedResponseIds.has(response.id)) {
        processedResponseIds.add(response.id);

        let questionText = "Question not available";
        
        if (typeof response.promptId === "object" && response.promptId) {
          questionText =
            (response.promptId as any).question ||
            (response.promptId as any).title ||
            "Question not available";
                  } else if (typeof response.promptId === "string") {
            // First try to find in prompts array
            const matchingPrompt = safePrompts.find(
              (p: any) => p.id === response.promptId
            );
          
                    if (matchingPrompt) {
            questionText =
              matchingPrompt.content ||
              matchingPrompt.title ||
              "Question not available";
          } else {
            // Fallback: show promptId if prompt not found
            questionText = `Question ID: ${response.promptId}`;
          }
        }

        const qaItem = {
          id: response.id,
          type: "qa",
          title: questionText.length > 50 ? questionText.substring(0, 50) + "..." : questionText,
          content: response.content,
          date: new Date(response.createdAt).toISOString().split("T")[0],
          createdAt: response.createdAt,
          media: response.attachments,
          visibility: response.visibility,
          creator: {
            id: response.parentId || currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          parentId: response.parentId || currentUser?.id,
          metadata: {
            promptId: response.promptId,
            feedback: response.feedback,
            question: questionText,
          },
        };
        
        items.push(qaItem);
      }
    });

    // Add health records
    const processedHealthIds = new Set();
    const filteredHealthRecords = safeHealthRecords.filter((record) => record.childId === id);
    
    filteredHealthRecords.forEach((record) => {
        if (!processedHealthIds.has(record.id)) {
          processedHealthIds.add(record.id);
          items.push({
            id: record.id,
            type: "health",
            title: record.title,
            content: record.description,
            date: record.startDate,
            createdAt: record.createdAt,
            media: record.attachments,
            visibility: record.visibility,
            metadata: {
              type: record.type,
              endDate: record.endDate,
              doctorName: record.doctorName,
              location: record.location,
            },
          });
        }
      });

    // Add growth records
    const processedGrowthIds = new Set();
    const filteredGrowthRecords = safeGrowthRecords.filter((record) => record.childId === id);
    
    filteredGrowthRecords.forEach((record) => {
        if (!processedGrowthIds.has(record.id)) {
          processedGrowthIds.add(record.id);
          items.push({
            id: record.id,
            type: "growth",
            title: `${record.type} Record`,
            content: `${record.value} ${record.unit}`,
            date: record.date,
            createdAt: record.createdAt,
            visibility: record.visibility,
            metadata: {
              type: record.type,
              value: record.value,
              unit: record.unit,
              source: record.source,
              notes: record.notes,
            },
          });
        }
      });

    // Sort by date (newest first)
    const sortedItems = items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    

    
    return sortedItems;
  }, [
    id,
    memories || [],
    responses || [],
    healthRecords || [],
    growthRecords || [],
    prompts || [],
    currentUser,
  ]);

  // Filter timeline items based on user permissions
  // In child profile, owner should see ALL posts (both public and private)
  const filteredTimelineItems = viewerIsOwner 
    ? timelineItems // Owner sees all posts
    : timelineItems; // Temporarily show all posts for now

  // Debug filtered timeline items - temporarily commented out
  // if (timelineItems && filteredTimelineItems) {
  //   console.log('🔍 Filtered timeline items debug:', {
  //     viewerIsOwner,
  //     totalItems: timelineItems.length || 0,
  //     filteredItems: filteredTimelineItems.length || 0,
  //     publicItems: timelineItems.filter(item => item.visibility === 'public').length || 0,
  //     privateItems: timelineItems.filter(item => item.visibility === 'private').length || 0,
  //     memoryItems: timelineItems.filter(item => item.type === 'memory').length || 0,
  //     qaItems: timelineItems.filter(item => item.type === 'qa').length || 0
  //   });
  // }
  
  // Handle focus post from notification - only when there's actually a focusPost
  useEffect(() => {
    if (focusPost && postType && !hasProcessedFocusPost) {
      // Active tab is already set to timeline in the focusPost change effect
      setHasProcessedFocusPost(true);
    }
  }, [focusPost, postType, hasProcessedFocusPost]);

  // Separate useEffect for scrolling when timeline items are loaded - only when there's focusPost
  useEffect(() => {
    if (
      focusPost && // Only run when there's actually a focusPost
      filteredTimelineItems.length > 0 &&
      activeTab === "timeline" &&
      !hasScrolledToFocusPost
    ) {
      // Find the post in timeline items
      const targetItem = filteredTimelineItems.find((item) => {
        // Direct ID match
        if (item._id === focusPost || item.id === focusPost) {
          return true;
        }

        // For memories, check if focusPost matches the memory's MongoDB _id
        if (item.type === "memory" && postType === "memory") {
          const originalMemory = memories.find((m) => m.id === item.id);
          if (originalMemory && (originalMemory as any)._id === focusPost) {
            return true;
          }
        }

        // For Q&A responses, check if focusPost matches the response's MongoDB _id
        if (item.type === "qa" && postType === "prompt_response") {
          const originalResponse = responses.find((r) => r.id === item.id);
          if (originalResponse && (originalResponse as any)._id === focusPost) {
            return true;
          }
        }

        // For health records, check if focusPost matches the record's MongoDB _id
        if (item.type === "health" && postType === "health_record") {
          const originalRecord = healthRecords.find((r) => r.id === item.id);
          if (originalRecord && (originalRecord as any)._id === focusPost) {
            return true;
          }
        }

        // For growth records, check if focusPost matches the record's MongoDB _id
        if (item.type === "growth" && postType === "growth_record") {
          const originalRecord = growthRecords.find((r) => r.id === item.id);
          if (originalRecord && (originalRecord as any)._id === focusPost) {
            return true;
          }
        }

        return false;
      });

      if (targetItem && scrollViewRef.current) {
        // Wait for layout to complete and then scroll
        let retryCount = 0;
        const attemptScroll = () => {
          const itemPosition = itemPositionsRef.current.get(targetItem.id);
          if (itemPosition !== undefined) {
            scrollViewRef.current?.scrollTo({
              y: itemPosition - TOP_OFFSET,
              animated: true,
            });
            setHasScrolledToFocusPost(true);
            setScrollRetryCount(0); // Reset retry count on success
          } else {
            retryCount++;

            // Retry after a short delay with max retries to prevent infinite loop
            if (retryCount < MAX_SCROLL_RETRIES) {
              setTimeout(() => {
                if (!hasScrolledToFocusPost) {
                  attemptScroll();
                }
              }, 100);
            } else {
              setHasScrolledToFocusPost(true); // Stop trying
            }
          }
        };

        // Use setTimeout to ensure layout is complete
        setTimeout(attemptScroll, 100);
      }
    }
  }, [
    focusPost,
    filteredTimelineItems,
    activeTab,
    postType,
    memories,
    responses,
    healthRecords,
    growthRecords,
    hasScrolledToFocusPost
  ]);

  // Handle edit completion from HealthContent
  const handleHealthEditComplete = useCallback(() => {
    setEditingHealthItem(null);
    setEditingGrowthItem(null);
  }, []);

  // Handle onLayout for timeline items to store their positions
  const handleItemLayout = useCallback(
    (itemId: string, event: any) => {
      const { y } = event.nativeEvent.layout;
      itemPositionsRef.current.set(itemId, y);

      // Clear existing timeout and set new one to batch updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        forceUpdate();
        updateTimeoutRef.current = null;
      }, 16); // ~60fps
    },
    [forceUpdate]
  );

  // Retry loading memories
  const retryLoadMemories = useCallback(() => {
    if (id) {
      dispatch(clearMemories());
      dispatch(
        fetchMemories({
          childId: id,
          page: 1,
          limit: 50, // Increased to match initial load
        })
      );
    }
  }, [id, dispatch]);

  // Retry loading health data - TEMPORARILY COMMENTED OUT TO PREVENT CONTINUOUS API CALLS
  // const retryLoadHealthData = useCallback(() => {
  //   if (id) {
  //     dispatch(fetchGrowthRecords({ childId: id, filter: growthFilter }));
  //     dispatch(fetchHealthRecords({ childId: id, filter: healthFilter }));
  //   }
  // }, [id, dispatch, growthFilter, healthFilter]);

  // Debug: Track when memories change


  // Fetch child data when component mounts
  useEffect(() => {
    // Reset focus post processing state when component mounts or id changes
    // Only reset if there's no focusPost or if focusPost has changed
    if (!focusPost) {
      setHasProcessedFocusPost(false);
      setHasScrolledToFocusPost(false);
    }

    itemPositionsRef.current.clear(); // Reset item positions
    setScrollRetryCount(0); // Reset retry count

    if (id) {
      dispatch(fetchChild(id));
      // Fetch memories for this child, newest first - increased limit to show more memories
      dispatch(
        fetchMemories({
          childId: id,
          page: 1,
          limit: 50, // Increased from 10 to 50 to show more memories initially
        })
      );
      // Load Q&A responses for this child
      dispatch(fetchChildResponses({ childId: id, page: 1, limit: 50 }));
      // Load health and growth records for this child
      dispatch(fetchHealthRecords({ childId: id }));
      dispatch(fetchGrowthRecords({ childId: id }));
      dispatch(fetchPrompts({ isActive: true, limit: 50 })); // Load prompts with reasonable limit
    }

    // Cleanup when component unmounts
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      dispatch(clearCurrentChild());
      dispatch(clearMemories());
      // Clear other data when component unmounts
      dispatch(clearResponses());
      dispatch(clearPrompts());
      dispatch(clearHealthData());
    };
  }, [id, dispatch, focusPost]);

  // Reset focus state when focusPost changes
  useEffect(() => {
    if (focusPost) {
      setHasProcessedFocusPost(false);
      setHasScrolledToFocusPost(false);
      // Set active tab to timeline when there's a focusPost
      setActiveTab("timeline");
    }
  }, [focusPost]);



  // Refresh memories when add memory modal closes
  useEffect(() => {
    if (!showAddMemoryModal && id) {
      // Small delay to ensure the modal animation completes
      const timer = setTimeout(() => {
        // Don't clear memories on modal close to preserve loaded data
        // Just refresh the first page to get any new memories
        dispatch(
          fetchMemories({
            childId: id,
            page: 1,
            limit: 50,
          })
        );
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddMemoryModal, dispatch, id]);

  // Health data is managed by HealthContent component

  // Auto-retry memories when switching to memories tab if there's an error
  useEffect(() => {
    if (activeTab === "memories" && memoriesError && id) {
      // Small delay to avoid immediate retry
      const timer = setTimeout(() => {
        retryLoadMemories();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, memoriesError, id, retryLoadMemories]);

  // Health data is managed by HealthContent component

  // Handle memory modal close
  const handleMemoryModalClose = () => {
    setShowAddMemoryModal(false);
  };

  // Handle child profile edit
  const handleChildEdit = () => {
    setShowEditChildModal(true);
  };

  const handleChildEditClose = () => {
    setShowEditChildModal(false);
  };

  const handleChildEditSuccess = () => {
    setShowEditChildModal(false);
    // Refresh child data
    if (id) {
      dispatch(fetchChild(id));
    }
  };

  const handleChildDelete = () => {
    setShowDeleteChildConfirm(true);
  };

  const confirmDeleteChild = async () => {
    if (!id) return;

    try {
      await dispatch(deleteChild(id)).unwrap();
      setShowDeleteChildConfirm(false);
      // Navigate back to home after successful deletion
      router.push("/tabs/home");
    } catch (error: any) {
      let errorMessage = "Failed to delete child";

      if (error?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error?.status === 403) {
        errorMessage = "You do not have permission to delete this child.";
      } else if (error?.status === 404) {
        errorMessage = "Child not found.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  // Ensure unique memories and create unique keys
  const getUniqueMemories = () => {
    const uniqueMemories = Array.from(
      new Map(memories.map((memory) => [memory.id, memory])).values()
    );
    return uniqueMemories.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // Create unique key for FlatList
  const keyExtractor = (item: any, index: number) => {
    return `memory-${item.id}-${index}`;
  };

  // Load more memories when scrolling
  const loadMoreMemories = () => {
    if (hasMore && !memoriesLoading && id) {
      const nextPage = Math.floor(memories.length / 50) + 1; // Updated to match new limit
      dispatch(
        fetchMemories({
          childId: id,
          page: nextPage,
          limit: 50, // Increased to match initial load
        })
      );
    }
  };

  // Handle memory actions
  const handleMemoryPress = (memory: any) => {
    // Navigate to memory detail screen (to be implemented)
    if (memory?.id) {
      // console.log('Memory pressed:', memory.id);
    } else {
      // console.log('Memory pressed: No ID available');
    }
  };

  const handleMemoryEdit = (memory: Memory) => {
    if (memory?.id) {
      setEditingMemory(memory);
      setShowEditMemoryModal(true);
    } else {
      // Handle case where memory has no ID
    }
  };

  const handleMemoryDelete = (memory: Memory) => {
    if (memory?.id) {
      setEditingMemory(memory);
      setShowDeleteConfirm(true);
    } else {
      // Handle case where memory has no ID
    }
  };

  const confirmDeleteMemory = async () => {
    if (!editingMemory?.id) return;

    try {
      await dispatch(deleteMemory(editingMemory.id)).unwrap();
      Alert.alert("Success", "Memory deleted successfully");
      setShowDeleteConfirm(false);
      setEditingMemory(null);
    } catch (error: any) {
      let errorMessage = "Failed to delete memory";

      if (error?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error?.status === 403) {
        errorMessage = "You do not have permission to delete this memory.";
      } else if (error?.status === 404) {
        errorMessage = "Memory not found. It may have already been deleted.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const handleMemoryLike = (memory: any) => {
    if (memory?.id) {
      // Handle memory like (to be implemented)
    } else {
      // Handle case where memory has no ID
    }
  };

  const handleMemoryComment = (memory: any) => {
    // TODO: Implement comment functionality
  };

  const handleVisibilityUpdate = async (
    itemId: string,
    visibility: "private" | "public"
  ) => {
    try {
      // Find the item type and update accordingly
      const memory = memories.find((m) => m.id === itemId);
      if (memory) {
        // Update memory visibility without triggering API re-fetch
        await dispatch(
          updateMemory({ memoryId: itemId, data: { visibility } })
        ).unwrap();
        
        return;
      }

      const response = responses.find((r) => r.id === itemId);
      if (response) {
        console.log('❓ Found response, updating...');
        await dispatch(
          updateResponse({ responseId: itemId, data: { visibility } })
        ).unwrap();
        console.log('✅ Response visibility updated successfully');
        forceUpdate();
        return;
      }

      const healthRecord = healthRecords.find((h) => h.id === itemId);
      if (healthRecord) {
        await dispatch(
          updateHealthRecord({ recordId: itemId, data: { visibility } })
        ).unwrap();
        forceUpdate();
        return;
      }

      const growthRecord = growthRecords.find((g) => g.id === itemId);
      if (growthRecord) {
        await dispatch(
          updateGrowthRecord({ recordId: itemId, data: { visibility } })
        ).unwrap();
        forceUpdate();
        return;
      }

      // Item not found
    } catch (error) {
      throw error;
    }
  };

  // Q&A handlers
  const handleQAEdit = (response: any) => {
    // Find the actual response from Redux state
    const actualResponse = responses.find((r) => r.id === response.id);
    if (actualResponse) {
      // console.log('handleQAEdit: Found actual response:', {
      //   id: actualResponse.id,
      //   content: actualResponse.content,
      //   attachmentsCount: actualResponse.attachments?.length || 0,
      //   attachments: actualResponse.attachments
      // });
      setEditingResponse(actualResponse);
    } else {
      // console.log('handleQAEdit: Response not found in Redux state, using timeline item');
      setEditingResponse(response);
    }
    setShowEditResponseModal(true);
  };

  const handleEditResponseClose = () => {
    setShowEditResponseModal(false);
    setEditingResponse(null);
  };

  const handleEditResponseSuccess = () => {
    setShowEditResponseModal(false);
    setEditingResponse(null);
    // Refresh Q&A data
    if (id) {
      dispatch(fetchChildResponses({ childId: id, page: 1, limit: 50 }));
    }
  };

  const handleQADelete = async (response: any) => {
    if (!response?.id) {
      Alert.alert("Error", "Cannot delete: No response ID available");
      return;
    }

    // Show confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to delete this Q&A response?\n\n"${response.content?.substring(
        0,
        100
      )}${response.content?.length > 100 ? "..." : ""}"`
    );

    if (!confirmed) return;

    try {
      await dispatch(deleteResponse(response.id)).unwrap();
      Alert.alert("Success", "Q&A response deleted successfully");
    } catch (error: any) {
      let errorMessage = "Failed to delete Q&A response";

      if (error?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error?.status === 403) {
        errorMessage = "You do not have permission to delete this response.";
      } else if (error?.status === 404) {
        errorMessage = "Response not found. It may have already been deleted.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  // Handle search focused on current child
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    if (query.trim().length < 2) {
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      // Search all content but prioritize current child
      const results = await searchService.search(query);

      // Filter and prioritize results for current child
      const childResults = results.filter((result) => result.id === id);
      const otherResults = results.filter((result) => result.id !== id);

      setSearchResults([...childResults, ...otherResults]);
    } catch {
      // console.error('Search error:', error); // Commented out - not related to health/growth
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    const prevPath = window.location.pathname;
    // console.log('Back button pressed from', prevPath);

    router.back();

    // Sau 300ms, nếu vẫn ở cùng trang, thì fallback về Home
    setTimeout(() => {
      const newPath = window.location.pathname;
      if (newPath === prevPath) {
        // console.log('No back history, fallback to /tabs/home');
        router.push("/tabs/home");
      } else {
        // console.log('Back successful to', newPath);
      }
    }, 300);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Helper function to get display name
  const getDisplayName = (child: any) => {
    if (!child) return "";
    return child.nickname || `${child.firstName} ${child.lastName}`.trim();
  };

  // Get age in a human-readable format
  const getAge = (birthdate: string) => {
    const birth = new Date(birthdate);
    const today = new Date();

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }

    if (months < 0) {
      months = 0;
    }

    if (years > 0) {
      return `${years} year${years > 1 ? "s" : ""} old`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? "s" : ""} old`;
    } else {
      const days = Math.floor(
        (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)
      );
      return `${days} day${days > 1 ? "s" : ""} old`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <ScreenWithFooter>
        <AppHeader
          title="Child Profile"
          onBack={handleBack}
          onSearchChange={handleSearch}
          searchPlaceholder="Search for memories, milestones, health records..."
          showBackButton={true}
          canGoBack={true}
          showLogoutButton={true}
        />
        <LoadingSpinner message="Loading child profile..." />
      </ScreenWithFooter>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenWithFooter>
        <AppHeader
          title="Child Profile"
          onBack={handleBack}
          onSearchChange={handleSearch}
          searchPlaceholder="Search for memories, milestones, health records..."
          showBackButton={true}
          canGoBack={true}
          showLogoutButton={true}
        />
        <ErrorView
          message={error}
          onRetry={() => id && dispatch(fetchChild(id))}
        />
      </ScreenWithFooter>
    );
  }

  // No child found
  if (!currentChild) {
    return (
      <ScreenWithFooter>
        <AppHeader
          title="Child Profile"
          onBack={handleBack}
          onSearchChange={handleSearch}
          searchPlaceholder="Search for memories, milestones, health records..."
          showBackButton={true}
          canGoBack={true}
          showLogoutButton={true}
        />
        <ErrorView
          message="Child not found"
          onRetry={() => id && dispatch(fetchChild(id))}
        />
      </ScreenWithFooter>
    );
  }

  // Main content based on whether search is active
  const renderMainContent = () => {
    if (showSearchResults) {
      return (
        <SearchResults
          results={searchResults}
          loading={searchLoading}
          emptyMessage={`No results found for "${searchQuery}". Try searching for milestones, health records, or memories.`}
        />
      );
    }

    // For memories tab, use collapsible header layout
    if (activeTab === "memories") {
      return (
        <View style={styles.container}>
          {/* Fixed App Header */}
          <View style={styles.fixedAppHeader}>
            <AppHeader
              title={
                currentChild
                  ? `${getDisplayName(currentChild)}'s Profile`
                  : "Child Profile"
              }
              onBack={handleBack}
              onSearchChange={handleSearch}
              searchPlaceholder={`Search for ${
                currentChild ? getDisplayName(currentChild) : "child"
              }'s memories, milestones, health records...`}
              showBackButton={true}
              canGoBack={true}
              showLogoutButton={true}
            />
          </View>

          {/* Collapsible Header */}
          <Animated.View
            style={[
              styles.collapsibleHeader,
              {
                transform: [{ translateY: headerTranslateY }],
                zIndex: 1000,
              },
            ]}
          >
            {/* Child Header */}
            <View style={styles.childHeader}>
              <View style={styles.childInfo}>
                {currentChild.avatarUrl ? (
                  <Image
                    source={{ uri: currentChild.avatarUrl }}
                    style={styles.childAvatar}
                  />
                ) : (
                  <View style={styles.childAvatarPlaceholder}>
                    <MaterialIcons name="person" size={60} color="#ccc" />
                  </View>
                )}
                <View style={styles.childDetails}>
                  <Text style={styles.childName}>
                    {getDisplayName(currentChild)}
                  </Text>
                  <Text style={styles.childAge}>
                    {getAge(currentChild.birthdate)}
                  </Text>
                  <Text style={styles.childBirthdate}>
                    Born {formatDate(currentChild.birthdate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: "timeline", label: "Timeline", icon: "timeline" },
                { key: "health", label: "Health", icon: "medical-services" },
                { key: "memories", label: "Memories", icon: "photo" },
                { key: "qa", label: "Q&A", icon: "help" },
                { key: "profile", label: "Profile", icon: "person" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? "#4f8cff" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Scrollable Content */}
          <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.scrollableContent}
            contentContainerStyle={[
              styles.scrollableContentContainer,
              { paddingTop: 80 + headerHeight + 20 }, // AppHeader height + collapsible header height + padding
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={memoriesLoading && memories.length === 0}
                onRefresh={retryLoadMemories}
                colors={["#4f8cff"]}
                tintColor="#4f8cff"
              />
            }
          >
            {/* Memories Content */}
            {renderMemoriesContent()}
          </Animated.ScrollView>
        </View>
      );
    }

    // For Q&A tab, use collapsible header layout
    if (activeTab === "qa") {
      return (
        <View style={styles.container}>
          {/* Fixed App Header */}
          <View style={styles.fixedAppHeader}>
            <AppHeader
              title={
                currentChild
                  ? `${getDisplayName(currentChild)}'s Profile`
                  : "Child Profile"
              }
              onBack={handleBack}
              onSearchChange={handleSearch}
              searchPlaceholder={`Search for ${
                currentChild ? getDisplayName(currentChild) : "child"
              }'s memories, milestones, health records...`}
              showBackButton={true}
              canGoBack={true}
              showLogoutButton={true}
            />
          </View>

          {/* Collapsible Header */}
          <Animated.View
            style={[
              styles.collapsibleHeader,
              {
                transform: [{ translateY: headerTranslateY }],
                zIndex: 1000,
              },
            ]}
          >
            {/* Child Header */}
            <View style={styles.childHeader}>
              <View style={styles.childInfo}>
                {currentChild.avatarUrl ? (
                  <Image
                    source={{ uri: currentChild.avatarUrl }}
                    style={styles.childAvatar}
                  />
                ) : (
                  <View style={styles.childAvatarPlaceholder}>
                    <MaterialIcons name="person" size={60} color="#ccc" />
                  </View>
                )}
                <View style={styles.childDetails}>
                  <Text style={styles.childName}>
                    {getDisplayName(currentChild)}
                  </Text>
                  <Text style={styles.childAge}>
                    {getAge(currentChild.birthdate)}
                  </Text>
                  <Text style={styles.childBirthdate}>
                    Born {formatDate(currentChild.birthdate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: "timeline", label: "Timeline", icon: "timeline" },
                { key: "health", label: "Health", icon: "medical-services" },
                { key: "memories", label: "Memories", icon: "photo" },
                { key: "qa", label: "Q&A", icon: "help" },
                { key: "profile", label: "Profile", icon: "person" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? "#4f8cff" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Scrollable Content */}
          <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.scrollableContent}
            contentContainerStyle={[
              styles.scrollableContentContainer,
              { paddingTop: 80 + headerHeight + 20 }, // AppHeader height + collapsible header height + padding
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {/* Q&A Content */}
            <QAContent
              childId={id!}
              useScrollView={true}
              editingItem={editingQAItem}
            />
          </Animated.ScrollView>
        </View>
      );
    }

    // For Health tab, use collapsible header layout
    if (activeTab === "health") {
      return (
        <View style={styles.container}>
          {/* Fixed App Header */}
          <View style={styles.fixedAppHeader}>
            <AppHeader
              title={
                currentChild
                  ? `${getDisplayName(currentChild)}'s Profile`
                  : "Child Profile"
              }
              onBack={handleBack}
              onSearchChange={handleSearch}
              searchPlaceholder={`Search for ${
                currentChild ? getDisplayName(currentChild) : "child"
              }'s memories, milestones, health records...`}
              showBackButton={true}
              canGoBack={true}
              showLogoutButton={true}
            />
          </View>

          {/* Collapsible Header */}
          <Animated.View
            style={[
              styles.collapsibleHeader,
              {
                transform: [{ translateY: headerTranslateY }],
                zIndex: 1000,
              },
            ]}
          >
            {/* Child Header */}
            <View style={styles.childHeader}>
              <View style={styles.childInfo}>
                {currentChild.avatarUrl ? (
                  <Image
                    source={{ uri: currentChild.avatarUrl }}
                    style={styles.childAvatar}
                  />
                ) : (
                  <View style={styles.childAvatarPlaceholder}>
                    <MaterialIcons name="person" size={60} color="#ccc" />
                  </View>
                )}
                <View style={styles.childDetails}>
                  <Text style={styles.childName}>
                    {getDisplayName(currentChild)}
                  </Text>
                  <Text style={styles.childAge}>
                    {getAge(currentChild.birthdate)}
                  </Text>
                  <Text style={styles.childBirthdate}>
                    Born {formatDate(currentChild.birthdate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: "timeline", label: "Timeline", icon: "timeline" },
                { key: "health", label: "Health", icon: "medical-services" },
                { key: "memories", label: "Memories", icon: "photo" },
                { key: "qa", label: "Q&A", icon: "help" },
                { key: "profile", label: "Profile", icon: "person" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? "#4f8cff" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Scrollable Content */}
          <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.scrollableContent}
            contentContainerStyle={[
              styles.scrollableContentContainer,
              { paddingTop: 80 + headerHeight + 20 }, // AppHeader height + collapsible header height + padding
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {/* Health Content */}
            <HealthContent
              childId={id!}
              editingHealthItem={editingHealthItem}
              editingGrowthItem={editingGrowthItem}
              onEditComplete={handleHealthEditComplete}
            />
          </Animated.ScrollView>
        </View>
      );
    }

    // For Profile tab, use collapsible header layout
    if (activeTab === "profile") {
      return (
        <View style={styles.container}>
          {/* Fixed App Header */}
          <View style={styles.fixedAppHeader}>
            <AppHeader
              title={
                currentChild
                  ? `${getDisplayName(currentChild)}'s Profile`
                  : "Child Profile"
              }
              onBack={handleBack}
              onSearchChange={handleSearch}
              searchPlaceholder={`Search for ${
                currentChild ? getDisplayName(currentChild) : "child"
              }'s memories, milestones, health records...`}
              showBackButton={true}
              canGoBack={true}
              showLogoutButton={true}
            />
          </View>

          {/* Collapsible Header */}
          <Animated.View
            style={[
              styles.collapsibleHeader,
              {
                transform: [{ translateY: headerTranslateY }],
                zIndex: 1000,
              },
            ]}
          >
            {/* Child Header */}
            <View style={styles.childHeader}>
              <View style={styles.childInfo}>
                {currentChild.avatarUrl ? (
                  <Image
                    source={{ uri: currentChild.avatarUrl }}
                    style={styles.childAvatar}
                  />
                ) : (
                  <View style={styles.childAvatarPlaceholder}>
                    <MaterialIcons name="person" size={60} color="#ccc" />
                  </View>
                )}
                <View style={styles.childDetails}>
                  <Text style={styles.childName}>
                    {getDisplayName(currentChild)}
                  </Text>
                  <Text style={styles.childAge}>
                    {getAge(currentChild.birthdate)}
                  </Text>
                  <Text style={styles.childBirthdate}>
                    Born {formatDate(currentChild.birthdate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: "timeline", label: "Timeline", icon: "timeline" },
                { key: "health", label: "Health", icon: "medical-services" },
                { key: "memories", label: "Memories", icon: "photo" },
                { key: "qa", label: "Q&A", icon: "help" },
                { key: "profile", label: "Profile", icon: "person" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? "#4f8cff" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Scrollable Content */}
          <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.scrollableContent}
            contentContainerStyle={[
              styles.scrollableContentContainer,
              { paddingTop: 80 + headerHeight + 20 }, // AppHeader height + collapsible header height + padding
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Content */}
            {renderProfileContent()}
          </Animated.ScrollView>
        </View>
      );
    }

    // For Timeline tab, use collapsible header layout
    if (activeTab === "timeline") {
      return (
        <View style={styles.container}>
          {/* Fixed App Header */}
          <View style={styles.fixedAppHeader}>
            <AppHeader
              title={
                currentChild
                  ? `${getDisplayName(currentChild)}'s Profile`
                  : "Child Profile"
              }
              onBack={handleBack}
              onSearchChange={handleSearch}
              searchPlaceholder={`Search for ${
                currentChild ? getDisplayName(currentChild) : "child"
              }'s memories, milestones, health records...`}
              showBackButton={true}
              canGoBack={true}
              showLogoutButton={true}
            />
          </View>

          {/* Collapsible Header */}
          <Animated.View
            style={[
              styles.collapsibleHeader,
              {
                transform: [{ translateY: headerTranslateY }],
                zIndex: 1000,
              },
            ]}
          >
            {/* Child Header */}
            <View style={styles.childHeader}>
              <View style={styles.childInfo}>
                {currentChild.avatarUrl ? (
                  <Image
                    source={{ uri: currentChild.avatarUrl }}
                    style={styles.childAvatar}
                  />
                ) : (
                  <View style={styles.childAvatarPlaceholder}>
                    <MaterialIcons name="person" size={60} color="#ccc" />
                  </View>
                )}
                <View style={styles.childDetails}>
                  <Text style={styles.childName}>
                    {getDisplayName(currentChild)}
                  </Text>
                  <Text style={styles.childAge}>
                    {getAge(currentChild.birthdate)}
                  </Text>
                  <Text style={styles.childBirthdate}>
                    Born {formatDate(currentChild.birthdate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: "timeline", label: "Timeline", icon: "timeline" },
                { key: "health", label: "Health", icon: "medical-services" },
                { key: "memories", label: "Memories", icon: "photo" },
                { key: "qa", label: "Q&A", icon: "help" },
                { key: "profile", label: "Profile", icon: "person" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab(tab.key as TabType);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <MaterialIcons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? "#4f8cff" : "#666"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Scrollable Content */}
          <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.scrollableContent}
            contentContainerStyle={[
              styles.scrollableContentContainer,
              { paddingTop: 80 + headerHeight + 20 }, // AppHeader height + collapsible header height + padding
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {/* Timeline Content */}
            {renderTimelineContent()}
          </Animated.ScrollView>
        </View>
      );
    }

    // For other tabs, use ScrollView
    return (
      <ScrollView ref={scrollViewRef} style={styles.container}>
        {/* App Header */}
        <AppHeader
          title={
            currentChild
              ? `${getDisplayName(currentChild)}'s Profile`
              : "Child Profile"
          }
          onBack={handleBack}
          onSearchChange={handleSearch}
          searchPlaceholder={`Search for ${
            currentChild ? getDisplayName(currentChild) : "child"
          }'s memories, milestones, health records...`}
          showBackButton={true}
          canGoBack={true}
          showLogoutButton={true}
        />

        {/* Child Header */}
        <View style={styles.childHeader}>
          <View style={styles.childInfo}>
            {currentChild.avatarUrl ? (
              <Image
                source={{ uri: currentChild.avatarUrl }}
                style={styles.childAvatar}
              />
            ) : (
              <View style={styles.childAvatarPlaceholder}>
                <MaterialIcons name="person" size={60} color="#ccc" />
              </View>
            )}
            <View style={styles.childDetails}>
              <Text style={styles.childName}>
                {getDisplayName(currentChild)}
              </Text>
              <Text style={styles.childAge}>
                {getAge(currentChild.birthdate)}
              </Text>
              <Text style={styles.childBirthdate}>
                Born {formatDate(currentChild.birthdate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: "timeline", label: "Timeline", icon: "timeline" },
            { key: "health", label: "Health", icon: "medical-services" },
            { key: "memories", label: "Memories", icon: "photo" },
            { key: "qa", label: "Q&A", icon: "help" },
            { key: "profile", label: "Profile", icon: "person" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.activeTabButton,
              ]}
              onPress={() => {
                // Using a predefined list of valid tab keys to prevent log injection
                const validTabKeys = [
                  "timeline",
                  "health",
                  "memories",
                  "qa",
                  "profile",
                ];
                if (validTabKeys.includes(tab.key)) {
                  // console.log(`Tab pressed: ${tab.key}`); // Commented out - not related to health/growth
                  setActiveTab(tab.key as TabType);
                }
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? "#4f8cff" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>{renderTabContent()}</View>
      </ScrollView>
    );
  };

  return (
    <ScreenWithFooter>
      {renderMainContent()}
      {id && (
        <AddMemoryModal
          visible={showAddMemoryModal}
          onClose={handleMemoryModalClose}
          childId={id}
        />
      )}

      {/* Edit Memory Modal */}
      <EditMemoryModal
        visible={showEditMemoryModal}
        onClose={() => {
          setShowEditMemoryModal(false);
          setEditingMemory(null);
        }}
        memory={editingMemory}
      />

      {/* Delete Confirmation Modal */}
      <ModalConfirm
        visible={showDeleteConfirm}
        title="Delete Memory"
        message={`Are you sure you want to delete "${editingMemory?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMemory}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setEditingMemory(null);
        }}
      />

      {/* Edit Response Modal */}
      <EditResponseModal
        visible={showEditResponseModal}
        response={editingResponse}
        onClose={handleEditResponseClose}
        onSuccess={handleEditResponseSuccess}
      />

      {/* Edit Child Profile Modal */}
      <EditChildProfileModal
        visible={showEditChildModal}
        child={currentChild}
        onClose={handleChildEditClose}
        onSuccess={handleChildEditSuccess}
      />

      {/* Delete Child Confirmation Modal */}
      <ModalConfirm
        visible={showDeleteChildConfirm}
        title="Delete Child"
        message={`Are you sure you want to delete "${currentChild?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteChild}
        onCancel={() => setShowDeleteChildConfirm(false)}
      />
    </ScreenWithFooter>
  );

  // Render tab content based on active tab
  function renderTabContent() {
    switch (activeTab) {
      case "timeline":
        return renderTimelineContent();
      case "health":
        return renderHealthContent();
      case "qa":
        return renderQAContent();
      case "profile":
        return renderProfileContent();
      default:
        return renderTimelineContent();
    }
  }

  // Timeline content
  function renderTimelineContent() {
    // Check if data is still loading (only for initial load, not updates)
    const isLoading = memoriesLoading || !id;

    if (isLoading) {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.contentTitle}>Timeline</Text>
          <LoadingSpinner message="Loading timeline..." />
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.contentTitle}>Timeline</Text>

        {filteredTimelineItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="timeline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No timeline items yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add memories, health records, or Q&A responses to see them here
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {filteredTimelineItems.map((item: any, index: number) => {
              const uniqueKey = `${item.type}-${item.id}-${index}`;

              switch (item.type) {
                case "memory":
                  return (
                    <View
                      key={uniqueKey}
                      onLayout={(event) => handleItemLayout(item.id, event)}
                    >
                      <TimelineItem
                        item={item}
                        highlight={
                          !!focusPost && (item._id === focusPost || item.id === focusPost)
                        }
                        onPress={() => handleMemoryPress(item)}
                        onEdit={() => {
                          // Find the original memory from memories array
                          const originalMemory = memories.find(
                            (m) => m.id === item.id
                          );
                          if (originalMemory) {
                            handleMemoryEdit(originalMemory);
                          } else {
                            handleMemoryEdit(item);
                          }
                        }}
                        onDelete={() => handleMemoryDelete(item)}
                        onLike={() => handleMemoryLike(item)}
                        onComment={() => handleMemoryComment(item)}
                        onVisibilityUpdate={handleVisibilityUpdate}
                        isOwner={viewerIsOwner}
                      />
                    </View>
                  );
                case "qa":
                  return (
                    <View
                      key={uniqueKey}
                      onLayout={(event) => handleItemLayout(item.id, event)}
                    >
                      <TimelineItem
                        item={item}
                        highlight={
                          !!focusPost && (item._id === focusPost || item.id === focusPost)
                        }
                        onEdit={() => handleQAEdit(item)}
                        onDelete={() => handleQADelete(item)}
                        onVisibilityUpdate={handleVisibilityUpdate}
                        isOwner={viewerIsOwner}
                      />
                    </View>
                  );
                case "health":
                  // For health records, use TimelineItem for now
                  return (
                    <View
                      key={uniqueKey}
                      onLayout={(event) => handleItemLayout(item.id, event)}
                    >
                      <TimelineItem
                        item={item}
                        highlight={
                          !!focusPost && (item._id === focusPost || item.id === focusPost)
                        }
                        onEdit={() => {
                          setEditingHealthItem(item);
                          // Don't automatically switch to health tab - let user stay on timeline
                        }}
                        onDelete={async () => {
                          if (!item?.id) {
                            Alert.alert(
                              "Error",
                              "Cannot delete: No health record ID available"
                            );
                            return;
                          }

                          Alert.alert(
                            "Delete Health Record",
                            `Are you sure you want to delete this health record?\n\n"${item.title}"`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await dispatch(
                                      deleteHealthRecord(item.id)
                                    ).unwrap();
                                    Alert.alert(
                                      "Success",
                                      "Health record deleted successfully"
                                    );
                                  } catch (error: any) {
                                    let errorMessage =
                                      "Failed to delete health record";

                                    if (error?.status === 401) {
                                      errorMessage =
                                        "Authentication failed. Please log in again.";
                                    } else if (error?.status === 403) {
                                      errorMessage =
                                        "You do not have permission to delete this record.";
                                    } else if (error?.status === 404) {
                                      errorMessage =
                                        "Health record not found. It may have already been deleted.";
                                    } else if (error?.message) {
                                      errorMessage = error.message;
                                    }

                                    Alert.alert("Error", errorMessage);
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        onVisibilityUpdate={handleVisibilityUpdate}
                        isOwner={viewerIsOwner}
                      />
                    </View>
                  );
                case "growth":
                  // For growth records, use TimelineItem for now
                  return (
                    <View
                      key={uniqueKey}
                      onLayout={(event) => handleItemLayout(item.id, event)}
                    >
                      <TimelineItem
                        item={item}
                        highlight={
                          !!focusPost && (item._id === focusPost || item.id === focusPost)
                        }
                        onEdit={async () => {
                          // Fetch full record data before editing
                          try {
                            const fullRecord = await dispatch(
                              fetchGrowthRecord(item.id)
                            ).unwrap();
                            setEditingGrowthItem(fullRecord);
                          } catch (error) {
                            // Fallback to using the timeline item
                            setEditingGrowthItem(item);
                          }
                          // Don't automatically switch to health tab - let user stay on timeline
                        }}
                        onDelete={async () => {
                          if (!item?.id) {
                            Alert.alert(
                              "Error",
                              "Cannot delete: No growth record ID available"
                            );
                            return;
                          }

                          Alert.alert(
                            "Delete Growth Record",
                            `Are you sure you want to delete this growth record?\n\n"${item.title}"`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await dispatch(
                                      deleteGrowthRecord(item.id)
                                    ).unwrap();
                                    Alert.alert(
                                      "Success",
                                      "Growth record deleted successfully"
                                    );
                                  } catch (error: any) {
                                    let errorMessage =
                                      "Failed to delete growth record";

                                    if (error?.status === 401) {
                                      errorMessage =
                                        "Authentication failed. Please log in again.";
                                    } else if (error?.status === 403) {
                                      errorMessage =
                                        "You do not have permission to delete this record.";
                                    } else if (error?.status === 404) {
                                      errorMessage =
                                        "Growth record not found. It may have already been deleted.";
                                    } else if (error?.message) {
                                      errorMessage = error.message;
                                    }

                                    Alert.alert("Error", errorMessage);
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        onVisibilityUpdate={handleVisibilityUpdate}
                        isOwner={viewerIsOwner}
                      />
                    </View>
                  );
                default:
                  return (
                    <View
                      key={uniqueKey}
                      onLayout={(event) => handleItemLayout(item.id, event)}
                    >
                      <TimelineItem
                        item={item}
                        highlight={
                          !!focusPost && (item._id === focusPost || item.id === focusPost)
                        }
                        isOwner={viewerIsOwner}
                      />
                    </View>
                  );
              }
            })}
          </View>
        )}

        {/* Include HealthContent component for edit modals even when on timeline tab */}
        <HealthContent
          childId={id!}
          editingHealthItem={editingHealthItem}
          editingGrowthItem={editingGrowthItem}
          onEditComplete={handleHealthEditComplete}
          renderModalsOnly={true}
          skipDataFetch={true} // Skip API calls when only rendering modals
        />
      </View>
    );
  }

  // Health content
  function renderHealthContent() {
    return (
      <HealthContent
        childId={id!}
        editingHealthItem={editingHealthItem}
        editingGrowthItem={editingGrowthItem}
        onEditComplete={handleHealthEditComplete}
      />
    );
  }

  // Memories content
  function renderMemoriesContent() {
    if (memoriesLoading && memories.length === 0) {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.contentTitle}>Memories</Text>
          <LoadingSpinner message="Loading memories..." />
        </View>
      );
    }

    if (memoriesError) {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.contentTitle}>Memories</Text>
          <ErrorView message={memoriesError} onRetry={retryLoadMemories} />
        </View>
      );
    }

    if (memories.length === 0) {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.contentTitle}>Memories</Text>
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="photo" size={48} color="#ccc" />
            <Text style={styles.placeholderText}>No memories yet</Text>
            <Text style={styles.placeholderSubtext}>
              Start capturing precious moments with photos, videos, and notes.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddMemoryModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Memory</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.memoriesContainer}>
        <View style={styles.memoriesHeader}>
          <Text style={styles.contentTitle}>Memories</Text>
          <TouchableOpacity
            style={styles.addMemoryButton}
            onPress={() => setShowAddMemoryModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#4f8cff" />
            <Text style={styles.addMemoryButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Render memories as regular views instead of FlatList */}
        {getUniqueMemories().map((memory, index) => {
          // Use creator info from memory object if available, otherwise extract from parentId
          let creator = undefined;
          if (memory.creator) {
            // Use creator info from memory object (preferred)
            creator = {
              id: memory.creator.id,
              firstName: memory.creator.firstName,
              lastName: memory.creator.lastName,
              avatar: memory.creator.avatar,
              email: "", // Required by User type
              role: "",
              createdAt: "",
              updatedAt: "",
            };
          } else if (memory.parentId && typeof memory.parentId === "object") {
            // Fallback: extract from parentId (legacy)
            creator = {
              id: memory.parentId._id || memory.parentId.id,
              firstName: memory.parentId.firstName,
              lastName: memory.parentId.lastName,
              avatar: memory.parentId.avatar,
              email: "", // Required by User type
              role: "",
              createdAt: "",
              updatedAt: "",
            };
          }

          return (
            <MemoryItem
              key={keyExtractor(memory, index)}
              memory={memory}
              creator={creator}
              onPress={handleMemoryPress}
              onEdit={handleMemoryEdit}
              onDelete={handleMemoryDelete}
              onLike={handleMemoryLike}
              onComment={handleMemoryComment}
            />
          );
        })}

        {/* Load more indicator */}
        {memoriesLoading && memories.length > 0 && (
          <View style={styles.loadingMore}>
            <LoadingSpinner message="Loading more memories..." />
          </View>
        )}

        {/* Load more trigger */}
        {hasMore && !memoriesLoading && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadMoreMemories}
          >
            <Text style={styles.loadMoreButtonText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Q&A content
  function renderQAContent() {
    return (
      <QAContent
        childId={id!}
        useScrollView={true}
        editingItem={editingQAItem}
      />
    );
  }

  // Profile content
  function renderProfileContent() {
    if (!currentChild) return null;

    return (
      <View style={styles.contentContainer}>
        <View style={styles.profileHeader}>
          <Text style={styles.contentTitle}>Profile Details</Text>
          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleChildEdit}
            >
              <MaterialIcons name="edit" size={20} color="#4f8cff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleChildDelete}
            >
              <MaterialIcons name="delete" size={20} color="#e53935" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileDetails}>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>First Name:</Text>
            <Text style={styles.profileValue}>{currentChild.firstName}</Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Last Name:</Text>
            <Text style={styles.profileValue}>{currentChild.lastName}</Text>
          </View>
          {currentChild.nickname && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Nickname:</Text>
              <Text style={styles.profileValue}>{currentChild.nickname}</Text>
            </View>
          )}
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Birthdate:</Text>
            <Text style={styles.profileValue}>
              {formatDate(currentChild.birthdate)}
            </Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Age:</Text>
            <Text style={styles.profileValue}>
              {getAge(currentChild.birthdate)}
            </Text>
          </View>
          {currentChild.gender && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Gender:</Text>
              <Text style={styles.profileValue}>
                {currentChild.gender.charAt(0).toUpperCase() +
                  currentChild.gender.slice(1)}
              </Text>
            </View>
          )}
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Created:</Text>
            <Text style={styles.profileValue}>
              {formatDate(currentChild.createdAt)}
            </Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Last Updated:</Text>
            <Text style={styles.profileValue}>
              {formatDate(currentChild.updatedAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fixedAppHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 1001,
  },
  collapsibleHeader: {
    position: "absolute",
    top: 80, // Position below the AppHeader
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 1000,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollableContentContainer: {
    flexGrow: 1,
  },
  childHeader: {
    backgroundColor: "#f8f9ff",
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  childInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  childAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  childAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  childDetails: {
    flex: 1,
  },
  childName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  childAge: {
    fontSize: 18,
    color: "#4f8cff",
    fontWeight: "600",
    marginBottom: 4,
  },
  childBirthdate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  childBio: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#4f8cff",
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  activeTabText: {
    color: "#4f8cff",
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  placeholderSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  profileDetails: {
    backgroundColor: "#f8f9ff",
    borderRadius: 12,
    padding: 16,
  },
  profileItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    width: 100,
  },
  profileValue: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
  memoriesContainer: {
    flex: 1,
  },
  memoriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  addMemoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addMemoryButtonText: {
    color: "#4f8cff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  memoriesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingMore: {
    paddingVertical: 20,
  },
  addButton: {
    marginTop: 20,
    backgroundColor: "#4f8cff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadMoreButton: {
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  loadMoreButtonText: {
    color: "#4f8cff",
    fontSize: 16,
    fontWeight: "600",
  },
  timelineContainer: {
    gap: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  profileActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f7fa",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: "#00796b",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
});
