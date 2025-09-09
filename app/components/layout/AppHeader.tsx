import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { NotificationBadge } from "../notification/NotificationBadge";

interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  onForward?: () => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (text: string) => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  showBackButton?: boolean;
  showForwardButton?: boolean;
  showTitle?: boolean;
  showNotificationBadge?: boolean;
  rightComponent?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onBack,
  onForward,
  showSearch = true,
  searchPlaceholder = "Search memories",
  onSearchChange,
  canGoBack = true,
  canGoForward = false,
  showBackButton = true,
  showForwardButton = false,
  showTitle = true,
  showNotificationBadge = false,
  rightComponent,
}) => {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (onSearchChange) {
      onSearchChange(text);
    }
  };

  const handleBack = useCallback(() => {
    try {
      if (onBack) {
        onBack();
      } else if (canGoBack) {
        router.back();
      } else {
        router.push("/tabs/home");
      }
    } catch (error) {
      try {
        router.push("/tabs/home");
      } catch (fallbackError) {
        // Final fallback - do nothing
      }
    }
  }, [onBack, canGoBack, router]);


  return (
    <View style={styles.headerContainer}>
      {/* Search box as main header */}
      {showSearch && (
        <View style={styles.searchRow}>
          {/* Back Arrow */}
          {showBackButton &&
            (() => {
              return true;
            })() && (
              <TouchableOpacity
                onPress={() => {
                  handleBack();
                }}
                style={[
                  styles.navButton,
                  !canGoBack && styles.navButtonDisabled,
          
                ]}
                disabled={!canGoBack}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                testID="back-button"
                onPressIn={() => {}}
                onPressOut={() => {}}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={canGoBack ? "#333" : "#ccc"}
                />
              </TouchableOpacity>
            )}

          {/* Search box */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#666"
              value={searchText}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange("")}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Right side components */}
          <View style={styles.rightContainer}>
            {showNotificationBadge && <NotificationBadge size="medium" />}
            {rightComponent}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingTop: 40,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  navButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    zIndex: 10,
    elevation: 5,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: "#333",
    paddingVertical: 0,
    fontWeight: "400",
  },
  clearButton: {
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
});

export default AppHeader;
