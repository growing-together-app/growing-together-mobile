import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
import { useThemeColor } from '../../hooks/useThemeColor';
import { fetchUnreadCount } from '../../redux/slices/notificationSlice';
import { RootState } from '../../redux/store';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  onPress?: () => void;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  size = 'medium',
  showIcon = true,
  onPress,
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { unreadCount, refreshing } = useSelector((state: RootState) => state.notifications);
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.user);
  
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  // Use polling hook for automatic refresh (60 seconds to reduce API calls)
  const { polling } = useNotificationPolling(60000);

  // Fetch unread count once when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUnreadCount() as any);
    }
  }, [isAuthenticated, dispatch]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/notifications');
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return { width: 16, height: 16, fontSize: 10 };
      case 'large':
        return { width: 24, height: 24, fontSize: 14 };
      default:
        return { width: 20, height: 20, fontSize: 12 };
    }
  };

  const badgeSize = getBadgeSize();

  if (!unreadCount || unreadCount === 0) {
    return (
      <TouchableOpacity onPress={handlePress} style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={24} color={textColor} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      {showIcon && (
        <Ionicons name="notifications-outline" size={24} color={textColor} />
      )}
      <View
        style={[
          styles.badge,
          {
            width: badgeSize.width,
            height: badgeSize.height,
            backgroundColor: '#FF3B30',
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              fontSize: badgeSize.fontSize,
              color: 'white',
            },
          ]}
        >
          {unreadCount > 99 ? '99+' : String(unreadCount || 0)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconContainer: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
  },
  badgeText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
