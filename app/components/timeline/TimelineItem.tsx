import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { commentService } from "../../services/commentService";
import CommentSystem, { CommentModal } from "../CommentSystem";
import MediaViewerBase from "../media/MediaViewerBase";
import { DeleteButton, EditButton } from "../ui/EditDeleteButtons";
import ReactionBar from "../ui/ReactionBar";
import VisibilityToggle from "../ui/VisibilityToggle";

interface TimelineItemProps {
  item: any;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onVisibilityUpdate?: (
    itemId: string,
    visibility: "private" | "public"
  ) => void;
  // New: whether the current viewer is the owner of the content's child
  isOwner?: boolean;
  // New: highlight the item if it matches focusPost
  highlight?: boolean;
}

const TimelineItem = React.memo(({
  item,
  onPress,
  onEdit,
  onDelete,
  onLike,
  onComment,
  onVisibilityUpdate,
  isOwner = false,
  highlight = false,
}: TimelineItemProps) => {
  const [showComments, setShowComments] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  // Animation for highlight effect
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const borderAnimation = useRef(new Animated.Value(0)).current;



  const getItemType = () => {
    switch (item?.type) {
      case "memory":
        return "Memory";
      case "qa":
        return "PromptResponse";
      case "health":
        return "HealthRecord";
      case "growth":
        return "GrowthRecord";
      default:
        return "Memory";
    }
  };

  const getItemTypeForComment = () => {
    switch (item?.type) {
      case "memory":
        return "memory";
      case "qa":
        return "promptResponse";
      case "health":
        return "healthRecord";
      case "growth":
        return "growthRecord";
      default:
        return "memory";
    }
  };

  const getItemIcon = () => {
    switch (item?.type) {
      case "memory":
        return "photo";
      case "qa":
        return "help";
      case "health":
        return "medical-services";
      case "growth":
        return "trending-up";
      default:
        return "photo";
    }
  };

  const getItemColor = () => {
    switch (item?.type) {
      case "memory":
        return "#4f8cff";
      case "qa":
        return "#ff9800";
      case "health":
        return "#4caf50";
      case "growth":
        return "#9c27b0";
      default:
        return "#4f8cff";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Vừa xong";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} giờ trước`;
    } else {
      return date.toLocaleDateString("vi-VN");
    }
  };

  // Fetch comment count - memoized to prevent unnecessary API calls
  const targetType = useMemo(() => {
    if (!item) return "memory";
    switch (item.type) {
      case "memory":
        return "memory";
      case "qa":
        return "promptResponse";
      case "health":
        return "healthRecord";
      case "growth":
        return "growthRecord";
      default:
        return "memory";
    }
  }, [item]);
  
  useEffect(() => {
    if (!item?.id) return;
    
    // Only fetch comment count if not already loaded
    if (commentCount === 0) {
      const fetchCommentCount = async () => {
        try {
          const apiResponse = await commentService.getComments(targetType, item.id, 1, 1);
          
          // Handle nested response format from backend
          let total = 0;
          const responseData = apiResponse as any;
          if (responseData.data?.pagination?.total) {
            // Backend returns: { data: { pagination: { total: 5 } } }
            total = responseData.data.pagination.total;
          } else if (responseData.pagination?.total) {
            // Direct format
            total = responseData.pagination.total;
          }
          
          setCommentCount(total);
        } catch (error) {
          console.error('Error fetching comment count:', error);
          setCommentCount(0);
        }
      };

      fetchCommentCount();
    }
  }, [item?.id, targetType, commentCount]);

  // Highlight animation effect
  useEffect(() => {
    if (highlight) {
      // Reset animations
      highlightAnimation.setValue(0);
      borderAnimation.setValue(0);
      
      // Start highlight animation
      Animated.sequence([
        // Fade in highlight
        Animated.timing(highlightAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        // Pulse border animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(borderAnimation, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(borderAnimation, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: false,
            }),
          ]),
          { iterations: 3 }
        ),
        // Fade out highlight
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [highlight, highlightAnimation, borderAnimation]);

  const handleCommentPress = () => {
    setShowCommentModal(true);
    onComment?.();
  };

  // Early return if item is not provided
  if (!item) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Highlight overlay - separate from main content */}
      <Animated.View 
        style={[
          styles.highlightOverlay,
          {
            backgroundColor: highlightAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['transparent', 'rgba(79, 140, 255, 0.1)'],
            }),
            borderWidth: borderAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 3],
            }),
            borderColor: borderAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['transparent', '#4f8cff'],
            }),
          },
        ]}
        pointerEvents="none"
      />
      {/* Item Header */}
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <MaterialIcons name={getItemIcon() as any} size={16} color="#fff" />
          <Text style={styles.typeText}>{item.type?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>

      {/* Item Content */}
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>{item.title}</Text>
        {item.content && <Text style={styles.description}>{item.content}</Text>}

        {/* Media */}
        {(item.media || item.attachments) && (item.media?.length > 0 || item.attachments?.length > 0) && (
          <View style={styles.mediaContainer}>
            <MediaViewerBase
              attachments={item.media || item.attachments || []}
              maxPreviewCount={3}
              onAttachmentPress={(attachment: any, index: number) => {
                // console.log(
                //   "Timeline item attachment pressed:",
                //   attachment,
                //   index
                // );
              }}
            />
          </View>
        )}

        {/* Creator Info */}
        {item.creator && (
          <View style={styles.creatorInfo}>
            {item.creator.avatar ? (
              <Image
                source={{ uri: item.creator.avatar }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <MaterialIcons name="person" size={16} color="#ccc" />
              </View>
            )}
            <Text style={styles.creatorName}>
              {item.creator.firstName} {item.creator.lastName}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <ReactionBar
            targetType={getItemType()}
            targetId={item.id}
            onReactionChange={onLike}
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCommentPress}
          >
            <MaterialIcons name="chat-bubble-outline" size={24} color="#1877F2" />
            <Text style={styles.actionText}>
              {commentCount > 0 ? `${commentCount} bình luận` : 'Bình luận'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightActions}>
          {isOwner && onVisibilityUpdate && (
            <VisibilityToggle
              visibility={item.visibility || "private"}
              onUpdate={async (visibility) =>
                onVisibilityUpdate(item.id, visibility)
              }
            />
          )}
          {isOwner && onEdit && (
            <EditButton onPress={onEdit} />
          )}
          {isOwner && onDelete && (
            <DeleteButton onPress={onDelete} />
          )}
        </View>
      </View>

      {/* Comments Section - Inline mode with better keyboard handling */}
      {showComments && (
        <View style={styles.commentsSection}>
          <CommentSystem
            targetType={getItemTypeForComment()}
            targetId={item.id}
            mode="inline"
            maxHeight={500} // Increased from 400 to give more space
            useScrollView={true}
            onCommentAdded={(comment) => {
              // Comment added successfully
              setCommentCount(prev => prev + 1);
            }}
            onCommentDeleted={(commentId) => {
              // Comment deleted successfully
              setCommentCount(prev => Math.max(0, prev - 1));
            }}
            onCommentEdited={(comment) => {
              // Comment edited successfully
            }}
          />
        </View>
      )}

      {/* Comment Modal - Full screen mode */}
      {item?.id && (
        <CommentModal
          visible={showCommentModal}
          onClose={() => setShowCommentModal(false)}
          targetType={getItemTypeForComment()}
          targetId={item.id}
          onCommentAdded={(comment) => {
            // Update comment count when comment is added
            setCommentCount(prev => prev + 1);
          }}
          onCommentDeleted={(commentId) => {
            // Update comment count when comment is deleted
            setCommentCount(prev => Math.max(0, prev - 1));
          }}
          onCommentEdited={(comment) => {
            // Comment edited successfully
          }}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
    position: "relative",
  },
  highlightOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f8cff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  mediaContainer: {
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  creatorAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  creatorName: {
    fontSize: 12,
    color: "#666",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: "#666",
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    // Remove maxHeight constraint - let CommentSystem handle it
  },
});

TimelineItem.displayName = 'TimelineItem';

export default TimelineItem;
