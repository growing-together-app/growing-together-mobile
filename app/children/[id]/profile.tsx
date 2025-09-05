import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
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
import AppHeader from "../../components/layout/AppHeader";
import ScreenWithFooter from "../../components/layout/ScreenWithFooter";
import { QAContent } from "../../components/qa";
import EditResponseModal from "../../components/qa/EditResponseModal";
import TimelineItem from "../../components/timeline/TimelineItem";
import AddButton from "../../components/ui/AddButton";
import ErrorView from "../../components/ui/ErrorView";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ModalConfirm from "../../components/ui/ModalConfirm";
import SearchResults from "../../components/ui/SearchResults";
import { useChildProfile } from "../../hooks/useChildProfile";
import { useTimelineItems } from "../../hooks/useTimelineItems";
import { useVisibilityUpdate } from "../../hooks/useVisibilityUpdate";
import { fetchChild } from "../../redux/slices/childSlice";
import { deleteGrowthRecord, deleteHealthRecord, fetchGrowthRecord } from "../../redux/slices/healthSlice";
import { deleteMemory, fetchMemories } from "../../redux/slices/memorySlice";
import { deleteResponse, fetchChildResponses } from "../../redux/slices/promptResponseSlice";

type TabType = "timeline" | "health" | "qa" | "memories" | "profile";

export default function ChildProfileScreen() {
  const {
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
  } = useChildProfile();

  // Timeline items hook
  const { timelineItems, filteredTimelineItems } = useTimelineItems(
    id,
    memories,
    responses,
    healthRecords,
    growthRecords,
    prompts,
    currentUser
  );

  // Visibility update hook
  const { handleVisibilityUpdate } = useVisibilityUpdate(
    memories,
    responses,
    healthRecords,
    growthRecords,
    forceUpdate
  );

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 200; // Height of the collapsible section
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: "clamp",
  });

  // Scroll ref for focusing on specific post
  const scrollViewRef = useRef<ScrollView>(null);

  // Separate useEffect for scrolling when timeline items are loaded
  useEffect(() => {
    if (
      focusPost &&
      filteredTimelineItems.length > 0 &&
      activeTab === "timeline" &&
      !hasScrolledToFocusPost
    ) {
      const targetItem = filteredTimelineItems.find((item) => {
        if (item._id === focusPost || item.id === focusPost) {
          return true;
        }

        if (item.type === "memory" && postType === "memory") {
          const originalMemory = memories.find((m) => m.id === item.id);
          if (originalMemory && (originalMemory as any)._id === focusPost) {
            return true;
          }
        }

        if (item.type === "qa" && postType === "prompt_response") {
          const originalResponse = responses.find((r) => r.id === item.id);
          if (originalResponse && (originalResponse as any)._id === focusPost) {
            return true;
          }
        }

        return false;
      });

      if (targetItem && scrollViewRef.current) {
        let retryCount = 0;
        const attemptScroll = () => {
          const itemPosition = itemPositionsRef.current.get(targetItem.id);
          if (itemPosition !== undefined) {
            scrollViewRef.current?.scrollTo({
              y: itemPosition - TOP_OFFSET,
              animated: true,
            });
            setHasScrolledToFocusPost(true);
            setScrollRetryCount(0);
          } else {
            retryCount++;
            if (retryCount < MAX_SCROLL_RETRIES) {
              setTimeout(() => {
                if (!hasScrolledToFocusPost) {
                  attemptScroll();
                }
              }, 100);
            } else {
              setHasScrolledToFocusPost(true);
            }
          }
        };
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
    hasScrolledToFocusPost,
    itemPositionsRef,
    TOP_OFFSET,
    MAX_SCROLL_RETRIES,
    setHasScrolledToFocusPost,
    setScrollRetryCount,
  ]);

  // Handle edit completion from HealthContent
  const handleHealthEditComplete = useCallback(() => {
    setEditingHealthItem(null);
    setEditingGrowthItem(null);
  }, [setEditingHealthItem, setEditingGrowthItem]);

  // Handle onLayout for timeline items to store their positions
  const handleItemLayout = useCallback(
    (itemId: string, event: any) => {
      const { y } = event.nativeEvent.layout;
      itemPositionsRef.current.set(itemId, y);
    },
    [itemPositionsRef]
  );

  // Memory handlers
  const handleMemoryPress = useCallback((memory: any) => {
    // Handle memory press if needed
  }, []);

  const handleMemoryEdit = useCallback((memory: any) => {
    setEditingMemory(memory);
    setShowEditMemoryModal(true);
  }, [setEditingMemory, setShowEditMemoryModal]);

  const handleMemoryDelete = useCallback(async (memory: any) => {
    if (!memory?.id) {
      Alert.alert("Error", "Cannot delete: No memory ID available");
      return;
    }

    Alert.alert(
      "Delete Memory",
      `Are you sure you want to delete this memory?\n\n"${memory.title}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(deleteMemory(memory.id)).unwrap();
              Alert.alert("Success", "Memory deleted successfully");
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
          },
        },
      ]
    );
  }, [dispatch]);

  const handleMemoryLike = useCallback(() => {
    // Handle memory like if needed
  }, []);

  const handleMemoryComment = useCallback(() => {
    // Handle memory comment if needed
  }, []);

  const confirmDeleteMemory = useCallback(async () => {
    if (!editingMemory?.id) {
      Alert.alert("Error", "Cannot delete: No memory ID available");
      return;
    }

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
  }, [dispatch, editingMemory, setShowDeleteConfirm, setEditingMemory]);

  // Q&A handlers
  const handleQAEdit = useCallback((response: any) => {
    const actualResponse = responses.find((r) => r.id === response.id);
    if (actualResponse) {
      setEditingResponse(actualResponse);
    } else {
      setEditingResponse(response);
    }
    setShowEditResponseModal(true);
  }, [responses, setEditingResponse, setShowEditResponseModal]);

  const handleEditResponseClose = useCallback(() => {
    setShowEditResponseModal(false);
    setEditingResponse(null);
  }, [setShowEditResponseModal, setEditingResponse]);

  const handleEditResponseSuccess = useCallback(() => {
    setShowEditResponseModal(false);
    setEditingResponse(null);
    if (id) {
      dispatch(fetchChildResponses({ childId: id, page: 1, limit: 50 }));
    }
  }, [setShowEditResponseModal, setEditingResponse, id, dispatch]);

  const handleQADelete = useCallback(async (response: any) => {
    if (!response?.id) {
      Alert.alert("Error", "Cannot delete: No response ID available");
      return;
    }

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
  }, [dispatch]);



  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "timeline":
        return renderTimelineContent();
      case "memories":
        return renderMemoriesContent();
      case "health":
        return renderHealthContent();
      case "qa":
        return renderQAContent();
      case "profile":
        return renderProfileContent();
      default:
        return renderTimelineContent();
    }
  };

  // Memories content
  const renderMemoriesContent = () => {
    const isLoading = memoriesLoading || !id;

    if (isLoading) {
      return (
        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            <Text style={styles.contentTitle}>Memories</Text>
                      <AddButton
            title="Add Memory"
            onPress={() => setShowAddMemoryModal(true)}
            variant="primary"
            iconSize={24}
          />
          </View>
          <LoadingSpinner message="Loading memories..." />
        </View>
      );
    }

    // Filter timeline items to show only memories
    const memoryItems = filteredTimelineItems.filter((item: any) => item.type === "memory");

    return (
      <View style={styles.contentContainer}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>Memories</Text>
          <AddButton
            title="Add Memory"
            onPress={() => setShowAddMemoryModal(true)}
            variant="primary"
            iconSize={24}
          />
        </View>

        {memoryItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="photo" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No memories yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add memories to capture special moments
            </Text>
            <AddButton
              title="Add Your First Memory"
              onPress={() => setShowAddMemoryModal(true)}
              variant="empty-state"
              iconSize={20}
            />
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {memoryItems.map((item: any, index: number) => (
              <View
                key={`memory-${item.id}-${index}`}
                onLayout={(event) => handleItemLayout(item.id, event)}
              >
                <TimelineItem
                  item={item}
                  highlight={
                    !!focusPost && (item._id === focusPost || item.id === focusPost)
                  }
                  onPress={() => handleMemoryPress(item)}
                  onEdit={() => {
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
                  onLike={handleMemoryLike}
                  onComment={handleMemoryComment}
                  onVisibilityUpdate={handleVisibilityUpdate}
                  isOwner={viewerIsOwner}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Timeline content
  const renderTimelineContent = () => {
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
                        onLike={handleMemoryLike}
                        onComment={handleMemoryComment}
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
                          try {
                            setEditingHealthItem(item);
                          } catch (error) {
                            setEditingHealthItem(item);
                          }
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
                          try {
                            const fullRecord = await dispatch(
                              fetchGrowthRecord(item.id)
                            ).unwrap();
                            setEditingGrowthItem(fullRecord);
                          } catch (error) {
                            setEditingGrowthItem(item);
                          }
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

        <HealthContent
          childId={id!}
          editingHealthItem={editingHealthItem}
          editingGrowthItem={editingGrowthItem}
          onEditComplete={handleHealthEditComplete}
          renderModalsOnly={true}
          skipDataFetch={true}
        />
      </View>
    );
  };

  // Health content
  const renderHealthContent = () => {
    return (
      <HealthContent
        childId={id!}
        editingHealthItem={editingHealthItem}
        editingGrowthItem={editingGrowthItem}
        onEditComplete={handleHealthEditComplete}
      />
    );
  };

  // Q&A content
  const renderQAContent = () => {
    return (
      <QAContent
        childId={id!}
        useScrollView={true}
        editingItem={editingQAItem}
      />
    );
  };

  // Profile content
  const renderProfileContent = () => {
    if (!currentChild) return null;

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.contentTitle}>Profile Details</Text>
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
              {new Date(currentChild.birthdate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Age:</Text>
            <Text style={styles.profileValue}>
              {(() => {
                const today = new Date();
                const birth = new Date(currentChild.birthdate);
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }
                return `${age} years old`;
              })()}
            </Text>
          </View>
          {currentChild.gender && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Gender:</Text>
              <Text style={styles.profileValue}>
                {currentChild.gender.charAt(0).toUpperCase() + currentChild.gender.slice(1)}
              </Text>
            </View>
          )}
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Created:</Text>
            <Text style={styles.profileValue}>
              {new Date(currentChild.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Last Updated:</Text>
            <Text style={styles.profileValue}>
              {new Date(currentChild.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Profile Actions */}
        {viewerIsOwner && (
          <View style={styles.profileActionsContainer}>
            <Text style={styles.profileActionsTitle}>Profile Actions</Text>
            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.editButton} onPress={handleChildEdit}>
                <MaterialIcons name="edit" size={20} color="#4f8cff" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleChildDelete}>
                <MaterialIcons name="delete" size={20} color="#e53935" />
                <Text style={styles.deleteButtonText}>Delete Child</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Early return if no id
  if (!id) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Loading child profile..." />
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <ErrorView message={error} onRetry={() => dispatch(fetchChild(id))} />
      </View>
    );
  }

  // Show not found state
  if (!currentChild) {
    return (
      <View style={styles.container}>
        <ErrorView message="Child not found" onRetry={() => dispatch(fetchChild(id))} />
      </View>
    );
  }

  return (
    <ScreenWithFooter>
      {/* Fixed App Header */}
      <AppHeader
        title={`${currentChild.firstName} ${currentChild.lastName}`}
        showSearch={true}
        searchPlaceholder="Search memories, health records, Q&A..."
        onSearchChange={(text: string) => {
          setSearchQuery(text);
          if (text.trim()) {
            setShowSearchResults(true);
            // Trigger search functionality
            handleSearch(text);
          } else {
            setShowSearchResults(false);
            setSearchResults([]);
          }
        }}
      />

      {/* Scrollable Content - Everything else scrolls */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollableContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={memoriesLoading}
            onRefresh={retryLoadMemories}
          />
        }
      >
        {/* Child Info */}
        <View style={styles.childHeader}>
          <View style={styles.childInfo}>
            {currentChild.avatarUrl ? (
              <Image source={{ uri: currentChild.avatarUrl }} style={styles.childAvatar} />
            ) : (
              <View style={styles.childAvatarPlaceholder}>
                <MaterialIcons name="person" size={30} color="#ccc" />
              </View>
            )}
            <View style={styles.childDetails}>
              <Text style={styles.childName}>
                {currentChild.firstName} {currentChild.lastName}
              </Text>
              {currentChild.nickname && (
                <Text style={styles.childNickname}>&ldquo;{currentChild.nickname}&rdquo;</Text>
              )}
              <Text style={styles.childAge}>
                {(() => {
                  const today = new Date();
                  const birth = new Date(currentChild.birthdate);
                  let age = today.getFullYear() - birth.getFullYear();
                  const monthDiff = today.getMonth() - birth.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                    age--;
                  }
                  return `${age} years old`;
                })()}
              </Text>
              <Text style={styles.childBirthdate}>
                Born {new Date(currentChild.birthdate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: "timeline", label: "Timeline", icon: "timeline" },
            { key: "memories", label: "Memories", icon: "photo" },
            { key: "health", label: "Health", icon: "medical-services" },
            { key: "qa", label: "Q&A", icon: "help" },
            { key: "profile", label: "Profile", icon: "person" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab(tab.key as TabType)}
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

      {/* Search Results */}
      {showSearchResults && (
        <SearchResults
          results={searchResults}
          onResultPress={(result) => {
            setShowSearchResults(false);
          }}
        />
      )}

      {/* Modals */}
      <AddMemoryModal
        visible={showAddMemoryModal}
        childId={id}
        onClose={handleMemoryModalClose}
      />

      <EditMemoryModal
        visible={showEditMemoryModal}
        memory={editingMemory}
        onClose={() => {
          setShowEditMemoryModal(false);
          setEditingMemory(null);
          if (id) {
            dispatch(fetchMemories({ childId: id, page: 1, limit: 50 }));
          }
        }}
      />

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

      <EditResponseModal
        visible={showEditResponseModal}
        response={editingResponse}
        onClose={handleEditResponseClose}
        onSuccess={handleEditResponseSuccess}
      />

      <EditChildProfileModal
        visible={showEditChildModal}
        child={currentChild}
        onClose={handleChildEditClose}
        onSuccess={handleChildEditSuccess}
      />

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
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    padding: 8,
  },
  collapsibleHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  scrollableContent: {
    flex: 1,
  },
  scrollableContentContainer: {
    flexGrow: 1,
  },
  childHeader: {
    backgroundColor: "#f8f9ff",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  childInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  childAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  childDetails: {
    flex: 1,
  },
  childName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  childNickname: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 2,
  },
  childAge: {
    fontSize: 16,
    color: "#4f8cff",
    fontWeight: "600",
    marginBottom: 2,
  },
  childBirthdate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  profileActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0f7fa",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#4f8cff",
  },
  editButtonText: {
    color: "#4f8cff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffebee",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e53935",
  },
  deleteButtonText: {
    color: "#e53935",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#4f8cff",
  },
  tabText: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
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
  timelineContainer: {
    gap: 16,
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
  profileActionsContainer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  profileActionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

});
