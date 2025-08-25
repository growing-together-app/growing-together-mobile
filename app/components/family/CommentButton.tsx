import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

interface CommentButtonProps {
  onPress?: () => void;
  size?: number;
  color?: string;
}

export default function CommentButton({ 
  onPress, 
  size = 16, 
  color = "#666" 
}: CommentButtonProps) {
  return (
    <TouchableOpacity
      style={styles.commentButton}
      onPress={() => {
    
        onPress?.();
      }}
    >
      <MaterialIcons name="chat-bubble-outline" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
}); 