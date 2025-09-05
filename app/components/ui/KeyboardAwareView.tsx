import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleProp,
    View,
    ViewStyle,
} from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  behavior?: 'height' | 'position' | 'padding';
  keyboardVerticalOffset?: number;
  enabled?: boolean;
}

const KeyboardAwareView: React.FC<KeyboardAwareViewProps> = ({
  children,
  style,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 20,
  enabled = true,
}) => {
  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

export default KeyboardAwareView;
