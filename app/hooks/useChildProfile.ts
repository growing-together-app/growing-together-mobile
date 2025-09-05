import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Alert } from "react-native";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
    clearCurrentChild,
    deleteChild,
    fetchChild,
} from "../redux/slices/childSlice";
import {
    clearHealthData,
    fetchGrowthRecords,
    fetchHealthRecords
} from "../redux/slices/healthSlice";
import {
    clearMemories,
    fetchMemories
} from "../redux/slices/memorySlice";
import {
    clearResponses,
    fetchChildResponses
} from "../redux/slices/promptResponseSlice";
import { clearPrompts, fetchPrompts } from "../redux/slices/promptSlice";
import { Memory } from "../services/memoryService";
import { SearchResult, searchService } from "../services/searchService";

type TabType = "timeline" | "health" | "qa" | "memories" | "profile";

export const useChildProfile = () => {
  const params = useLocalSearchParams<{
    id: string;
    focusPost?: string;
    postType?: string;
  }>();
  
  // Safety check for params with fallback
  const id = params?.id || '';
  const focusPost = params?.focusPost || '';
  const postType = params?.postType || '';
  
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

  // Auto-retry memories when switching to memories tab if there's an error
  useEffect(() => {
    if (activeTab === "memories" && memoriesError && id) {
      // Small delay to avoid immediate retry
      const timer = setTimeout(() => {
        retryLoadMemories();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, memoriesError, id]);

  // Handle focus post from notification - only when there's actually a focusPost
  useEffect(() => {
    if (focusPost && postType && !hasProcessedFocusPost) {
      // Active tab is already set to timeline in the focusPost change effect
      setHasProcessedFocusPost(true);
    }
  }, [focusPost, postType, hasProcessedFocusPost]);

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
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    const prevPath = window.location.pathname;
    router.back();

    // Sau 300ms, nếu vẫn ở cùng trang, thì fallback về Home
    setTimeout(() => {
      const newPath = window.location.pathname;
      if (newPath === prevPath) {
        router.push("/tabs/home");
      }
    }, 300);
  };

  // Retry loading memories
  const retryLoadMemories = useCallback(() => {
    if (id) {
      dispatch(
        fetchMemories({
          childId: id,
          page: 1,
          limit: 50,
        })
      );
    }
  }, [id, dispatch]);

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
    if (!currentChild?.id) {
      Alert.alert("Error", "Cannot delete: No child ID available");
      return;
    }

    try {
      await dispatch(deleteChild(currentChild.id)).unwrap();
      Alert.alert("Success", "Child deleted successfully");
      router.back();
    } catch (error: any) {
      let errorMessage = "Failed to delete child";

      if (error?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error?.status === 403) {
        errorMessage = "You do not have permission to delete this child.";
      } else if (error?.status === 404) {
        errorMessage = "Child not found. It may have already been deleted.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  return {
    // Params
    id,
    focusPost,
    postType,
    
    // State
    currentChild,
    loading,
    error,
    memories,
    memoriesLoading,
    memoriesUpdating,
    memoriesError,
    hasMore,
    responses,
    prompts,
    healthRecords,
    growthRecords,
    currentUser,
    activeTab,
    setActiveTab,
    hasProcessedFocusPost,
    hasScrolledToFocusPost,
    setHasScrolledToFocusPost,
    
    // Refs
    itemPositionsRef,
    forceUpdate,
    updateTimeoutRef,
    scrollRetryCount,
    setScrollRetryCount,
    TOP_OFFSET,
    MAX_SCROLL_RETRIES,
    
    // Computed
    viewerIsOwner,
    
    // Search state
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchLoading,
    setSearchLoading,
    showSearchResults,
    setShowSearchResults,
    
    // Modal states
    showAddMemoryModal,
    setShowAddMemoryModal,
    editingMemory,
    setEditingMemory,
    showEditMemoryModal,
    setShowEditMemoryModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showEditChildModal,
    setShowEditChildModal,
    showDeleteChildConfirm,
    setShowDeleteChildConfirm,
    editingQAItem,
    setEditingQAItem,
    editingHealthItem,
    setEditingHealthItem,
    editingGrowthItem,
    setEditingGrowthItem,
    showEditResponseModal,
    setShowEditResponseModal,
    editingResponse,
    setEditingResponse,
    creators,
    setCreators,
    
    // Actions
    dispatch,
    router,
    handleSearch,
    handleBack,
    retryLoadMemories,
    handleMemoryModalClose,
    handleChildEdit,
    handleChildEditClose,
    handleChildEditSuccess,
    handleChildDelete,
    confirmDeleteChild,
    fetchChild,
  };
};
