import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ReactionSystemProps {
  postId: string;
  onReactionPress?: (reactionType: string) => void;
}

export default function ReactionSystem({
  postId,
  onReactionPress,
}: ReactionSystemProps) {
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);

  const reactions = [
    { type: "like", icon: "👍", label: "Like" },
    { type: "love", icon: "❤️", label: "Love" },
    { type: "haha", icon: "😂", label: "Haha" },
    { type: "wow", icon: "😮", label: "Wow" },
    { type: "sad", icon: "😢", label: "Sad" },
    { type: "angry", icon: "😠", label: "Angry" },
  ];

  const isMenuVisible = showReactionMenu === postId;

  return (
    <View style={styles.reactionsContainer}>
      <View style={styles.reactionRow}>
        {/* Default reaction button */}
        <TouchableOpacity
          style={styles.defaultReactionButton}
          onPress={() => {
        
            onReactionPress?.("like");
          }}
          onLongPress={() => {
            setShowReactionMenu(isMenuVisible ? null : postId);
          }}
        >
          <Text style={styles.defaultReactionIcon}>👍</Text>
        </TouchableOpacity>

        {/* Reaction summary */}
        <View style={styles.reactionSummaryInline}>
          <Text style={styles.defaultReactionIcon}>👍</Text>
          <Text style={styles.reactionSummaryText}>Thích</Text>
        </View>
      </View>

      {/* Reaction menu - only show when long pressed */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReactionMenu(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowReactionMenu(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.reactionMenu}>
              {reactions.map((reaction) => (
                <TouchableOpacity
                  key={reaction.type}
                  style={styles.reactionButton}
                  onPress={() => {
                
                    setShowReactionMenu(null);
                    onReactionPress?.(reaction.type);
                  }}
                >
                  <Text style={styles.reactionIcon}>{reaction.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  reactionsContainer: {
    flexDirection: "row",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d0e3ff",
    position: "relative",
  },
  reactionButton: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    marginHorizontal: 1,
    marginVertical: 1,
  },
  reactionIcon: {
    fontSize: 18,
  },
  defaultReactionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "transparent",
  },
  defaultReactionIcon: {
    fontSize: 16,
    color: "#666",
  },
  reactionMenuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  reactionMenu: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "95%",
    minHeight: 60,
    justifyContent: "space-between",
    alignSelf: "center",
    gap: 8,
  },
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionSummaryInline: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  reactionSummaryText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
