import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AddChildModal from "../components/child/AddChildModal";
import ChildProfileCard from "../components/child/ChildProfileCard";
import FamilyGroupCard from "../components/family/FamilyGroupCard";
import AppHeader from "../components/layout/AppHeader";
import ScreenWithFooter from "../components/layout/ScreenWithFooter";
import AddButton from "../components/ui/AddButton";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import SearchResults from "../components/ui/SearchResults";
import UserProfileCard from "../components/user/UserProfileCard";
import UserProfileEditModal from "../components/user/UserProfileEditModal";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchMyOwnChildren } from "../redux/slices/childSlice";
import { fetchFamilyGroups } from "../redux/slices/familySlice";
import { fetchCurrentUser } from "../redux/slices/userSlice";
import { SearchResult, searchService } from "../services/searchService";
import { ChildUtils } from "../utils/childUtils";

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const {
    currentUser,
    loading: userLoading,
    error: userError,
  } = useAppSelector((state) => state.user);
  const { children, loading: childrenLoading, error: childrenError } = useAppSelector(
    (state) => state.children
  );
  const { familyGroups, loading: familyLoading, error: familyError } = useAppSelector(
    (state) => state.family
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const [familyGroupsExpanded, setFamilyGroupsExpanded] = useState(false);
  
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Fetch current user data on component mount
  useEffect(() => {
    if (user) {
      dispatch(fetchCurrentUser(user.id));
      dispatch(fetchMyOwnChildren());
      dispatch(fetchFamilyGroups());
      // fetchUnreadCount is handled by NotificationBadge polling
    }
  }, [dispatch, user]);

  // Refresh family groups when screen comes into focus (e.g., after accepting invitations)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        dispatch(fetchFamilyGroups());
        // fetchUnreadCount is handled by NotificationBadge polling
      }
    }, [dispatch, user])
  );

  // Handle search
  const handleSearch = async (query: string) => {
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
      const results = await searchService.search(query);
      setSearchResults(results);
    } catch (error) {
      // Search error handled silently
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  // Handle children errors using the shared utility
  useEffect(() => {
    ChildUtils.handleChildrenError(childrenError, dispatch);
  }, [childrenError, dispatch]);

  // Show error alerts for other errors
  useEffect(() => {
    if (familyError) {
      Alert.alert('Error', familyError);
    }
    if (userError) {
      Alert.alert("Error", userError);
    }
  }, [familyError, userError]);

  // Refresh children when add child modal closes (in case a child was added)
  useEffect(() => {
    if (!showAddChildModal && user) {
      // Small delay to ensure the modal animation completes
      const timer = setTimeout(() => {
        dispatch(fetchMyOwnChildren());
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddChildModal, dispatch, user]);

  // Use utility functions for child-related logic
  const validChildren = ChildUtils.getValidChildren(children);
  const hasChildren = ChildUtils.hasChildren(children);
  const childrenCount = ChildUtils.getChildrenCount(children);
  const isChildrenStillLoading = ChildUtils.isChildrenLoading(childrenLoading, children);
  const addChildButtonText = ChildUtils.getAddChildButtonText(hasChildren);
  const welcomeMessage = ChildUtils.getWelcomeMessage(hasChildren);

  // Family groups logic
  const hasFamilyGroups = familyGroups && familyGroups.length > 0;
  const familyGroupsCount = familyGroups?.length || 0;

  // Show loading spinner while fetching user data
  if (userLoading && !currentUser) {
    return (
      <ScreenWithFooter onSettingsPress={handleSettingsPress}>
        <AppHeader
          title="Home"
          onSearchChange={handleSearch}
          searchPlaceholder="Search memories"
          showBackButton={false}
          showForwardButton={false}
          showTitle={false}
        />
        <LoadingSpinner message="Loading your profile..." />
      </ScreenWithFooter>
    );
  }

  // UI for children section
  const renderChildrenSection = () => {
    // Show loading state
    if (isChildrenStillLoading) {
      return (
        <View style={styles.childrenSection}>
          <Text style={styles.sectionTitle}>Your Babies</Text>
          <Text style={styles.loadingText}>Loading your children...</Text>
        </View>
      );
    }

    // Show error state with retry button
    if (childrenError) {
      return (
        <View style={styles.childrenSection}>
          <Text style={styles.sectionTitle}>Your Babies</Text>
          <TouchableOpacity
            style={[styles.groupButton, { backgroundColor: '#fef2f2' }]}
            onPress={() => {
              dispatch(fetchMyOwnChildren());
            }}
          >
            <Text style={[styles.groupButtonText, { color: '#dc2626' }]}>
              Error loading children. Tap to retry.
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Calculate displayed children (max 2 unless expanded)
    const displayedChildren = childrenExpanded ? validChildren : validChildren.slice(0, 2);
    const hasMoreChildren = validChildren.length > 2;

    // Show children section (with or without children)
    return (
      <View style={styles.childrenSection}>
        <Text style={styles.sectionTitle}>Your Babies {hasChildren ? `(${childrenCount})` : ''}</Text>
        
        {/* Show children if any exist */}
        {hasChildren && (
          <>
            {displayedChildren.map((child, index) => (
              <TouchableOpacity
                key={`child-${child.id}-${index}`}
                style={styles.childCard}
                onPress={() => ChildUtils.handleChildCardPress(child.id, child.name)}
              >
                <ChildProfileCard
                  key={child.id}
                  avatarUrl={child.avatarUrl}
                  name={child.name}
                  birthdate={child.birthdate}
                />
              </TouchableOpacity>
            ))}
            
            {/* Show expand/collapse button if there are more than 2 children */}
            {hasMoreChildren && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => setChildrenExpanded(!childrenExpanded)}
              >
                <MaterialIcons 
                  name={childrenExpanded ? "expand-less" : "expand-more"} 
                  size={24} 
                  color="#3b4cca" 
                />
                <Text style={styles.seeMoreText}>
                  {childrenExpanded 
                    ? ''
                    : `${validChildren.length - 2}`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        
        {/* Show welcome message when no children */}
        {!hasChildren && (
          <Text style={styles.emptyStateText}>{welcomeMessage}</Text>
        )}
        
        {/* Action buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => ChildUtils.handleAddChildPress(dispatch, hasChildren, () => setShowAddChildModal(true))}
          >
            <Text style={styles.quickActionText}>{addChildButtonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // UI for family groups section
  const renderFamilyGroupsSection = () => {
    // Show loading state
    if (familyLoading) {
      return (
        <View style={styles.familyGroupsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Family Groups</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => dispatch(fetchFamilyGroups())}
            >
              <MaterialIcons name="refresh" size={20} color="#4f8cff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.loadingText}>Loading family groups...</Text>
        </View>
      );
    }

    // Show error state with retry button
    if (familyError) {
      return (
        <View style={styles.familyGroupsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Family Groups</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => dispatch(fetchFamilyGroups())}
            >
              <MaterialIcons name="refresh" size={20} color="#4f8cff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.groupButton, { backgroundColor: '#fee' }]}
            onPress={() => {
              dispatch(fetchFamilyGroups());
            }}
          >
            <Text style={[styles.groupButtonText, { color: '#c00' }]}>
              Error loading family groups. Tap to retry.
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show family groups if any exist
    if (hasFamilyGroups) {
      // Calculate displayed family groups (max 2 unless expanded)
      const displayedGroups = familyGroupsExpanded ? familyGroups : familyGroups.slice(0, 2);
      const hasMoreGroups = familyGroups.length > 2;

      return (
        <View style={styles.familyGroupsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Family Groups ({familyGroupsCount})</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => dispatch(fetchFamilyGroups())}
            >
              <MaterialIcons name="refresh" size={20} color="#4f8cff" />
            </TouchableOpacity>
          </View>
          
          {displayedGroups.map((group, index) => (
            <FamilyGroupCard
              key={`family-group-${group.id}-${index}`}
              id={group.id}
              name={group.name}
              avatarUrl={group.avatarUrl}
              description={group.description}
              memberCount={group.members?.length}
              subtitle={index === 0 ? "Primary Family Group" : "Family Group"}
              onPress={() => {
                router.push(`/family/${group.id}`);
              }}
            />
          ))}
          
          {/* Show expand/collapse button if there are more than 2 groups */}
          {hasMoreGroups && (
            <TouchableOpacity
              style={styles.seeMoreButton}
              onPress={() => setFamilyGroupsExpanded(!familyGroupsExpanded)}
            >
              <MaterialIcons 
                name={familyGroupsExpanded ? "expand-less" : "expand-more"} 
                size={24} 
                color="#3b4cca" 
              />
              <Text style={styles.seeMoreText}>
                {familyGroupsExpanded 
                  ? '' 
                  : `${familyGroups.length - 2}`
                }
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Action buttons */}
          <View style={styles.quickActions}>
            <AddButton
              title="+ Add Group"
              onPress={() => router.push("/family/create")}
              variant="primary"
            />
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/family/join-group")}
            >
              <Text style={styles.quickActionText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Show create/join button when no family groups
    return (
      <View style={styles.familyGroupsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Family Groups</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => dispatch(fetchFamilyGroups())}
          >
            <MaterialIcons name="refresh" size={20} color="#4f8cff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.groupButton}
          onPress={() => router.push("/family/join-group")}
        >
          <Text style={styles.groupButtonText}>
            Create or Join Family Group
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Main content based on whether search is active
  const renderMainContent = () => {
    if (showSearchResults) {
      return (
        <SearchResults
          results={searchResults}
          loading={searchLoading}
          emptyMessage="No results found. Try searching for your child&apos;s name, milestones, or family activities."
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Profile Card */}
        <UserProfileCard
          userId={user?.id ?? ''}
          firstName={currentUser?.firstName || user?.firstName}
          lastName={currentUser?.lastName || user?.lastName}
          avatar={currentUser?.avatar}
          onEditPress={() => setShowEditModal(true)}
        />

        <Text style={styles.welcomeTitle}>
          Welcome
          {currentUser?.firstName || user?.firstName
            ? `, ${currentUser?.firstName || user?.firstName}`
            : ""}
          !
        </Text>
        
        {/* <Text style={styles.welcomeSubtitle}>
          Ready to track your family&apos;s precious moments
        </Text> */}

        {/* Children Section */}
        {renderChildrenSection()}
        
        {/* Family Groups Section */}
        {renderFamilyGroupsSection()}
      </ScrollView>
    );
  };

      return (
      <ScreenWithFooter onSettingsPress={handleSettingsPress}>
        {/* Enhanced Header */}
        <AppHeader
          title="Home"
          onSearchChange={handleSearch}
          searchPlaceholder="Search memories"
          showBackButton={false}
          showForwardButton={false}
          showTitle={false}
          showNotificationBadge={true}
        />

        {/* Main Content */}
        {renderMainContent()}

        {/* Modals */}
        <UserProfileEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={user as any}
          currentUser={currentUser || undefined}
          loading={userLoading}
          error={userError}
        />

        <AddChildModal
          visible={showAddChildModal}
          onClose={() => setShowAddChildModal(false)}
        />
      </ScreenWithFooter>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  childrenSection: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    padding: 16,
  },
  groupButton: {
    backgroundColor: "#e0e7ff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
    alignItems: "center",
    width: "100%",
  },
  groupButtonText: {
    color: "#3b4cca",
    fontSize: 16,
    fontWeight: "bold",
  },
  childCard: {
    width: "100%",
    marginBottom: 16,
  },
  seeMoreButton: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: -10,
    alignSelf: 'flex-end',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  seeMoreText: {
    color: '#3b4cca',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    padding: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 0,
    marginBottom: 40,
    width: '100%',
  },
  quickActionButton: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  quickActionText: {
    color: '#3b4cca',
    fontSize: 14,
    fontWeight: 'bold',
  },
  familyGroupsSection: {
    width: "100%",
    backgroundColor: "#f0f7ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
  },
});
