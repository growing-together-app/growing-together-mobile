import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

export type AddButtonVariant = 'primary' | 'secondary' | 'empty-state' | 'modal';

interface AddButtonProps {
  title: string;
  onPress: () => void;
  variant?: AddButtonVariant;
  iconSize?: number;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconName?: keyof typeof MaterialIcons.glyphMap;
}

export default function AddButton({
  title,
  onPress,
  variant = 'primary',
  iconSize = 20,
  disabled = false,
  style,
  textStyle,
  iconName = 'add' as keyof typeof MaterialIcons.glyphMap
}: AddButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    disabled && styles.disabled,
    style
  ];

  const textStyles = [
    styles.baseText,
    styles[`${variant}Text`],
    disabled && styles.disabledText,
    textStyle
  ];

  const iconColor = disabled ? '#ccc' : styles[`${variant}Text`].color;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <MaterialIcons name={iconName} size={iconSize} color={iconColor} />
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  baseText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Primary variant - Màu xanh đậm, nền trắng, viền xanh
  primary: {
    backgroundColor: '#e0f7fa',
    borderWidth: 1,
    borderColor: '#4f8cff',
  },
  primaryText: {
    color: '#4f8cff',
  },
  
  // Secondary variant - Màu xanh nhạt, nền trắng, viền xanh
  secondary: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#4f8cff',
  },
  secondaryText: {
    color: '#4f8cff',
  },
  
  // Empty state variant - Màu xanh đậm, nền xanh, chữ trắng
  'empty-state': {
    backgroundColor: '#4f8cff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  'empty-stateText': {
    color: '#fff',
    fontSize: 16,
  },
  
  // Modal variant - Màu xanh đậm, nền xanh, chữ trắng
  modal: {
    backgroundColor: '#4f8cff',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
  },
  
  // Disabled state
  disabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  disabledText: {
    color: '#ccc',
  },
});
