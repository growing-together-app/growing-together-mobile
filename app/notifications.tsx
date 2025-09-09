import { API_BASE_URL } from '@env';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppHeader from './components/layout/AppHeader';
import ScreenWithFooter from './components/layout/ScreenWithFooter';
import NotificationList from './components/notification/NotificationList';
import { useThemeColor } from './hooks/useThemeColor';
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from './redux/slices/notificationSlice';
import { RootState } from './redux/store';
import authService from './services/authService';
import NotificationNavigationService from './services/notificationNavigationService';
import { Notification } from './services/notificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { unreadCount } = useSelector((state: RootState) => state.notifications);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [token, setToken] = React.useState<string>('');
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const primaryColor = useThemeColor({}, 'primary');

  useEffect(() => {
    // Only fetch notifications, unreadCount is handled by NotificationBadge polling
    dispatch(fetchNotifications({ page: 1, limit: 20 }) as any);
  }, [dispatch]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        // Only fetch notifications, unreadCount is handled by NotificationBadge polling
        dispatch(fetchNotifications({ page: 1, limit: 20 }) as any);
      }
    }, [dispatch, isAuthenticated])
  );

  useEffect(() => {
    const loadToken = async () => {
      try {
        const accessToken = await authService.getAccessToken();
        setToken(accessToken || '');
      } catch (error) {
        // Token loading error handled silently
        setToken('');
      }
    };
    
    if (isAuthenticated) {
      loadToken();
    }
  }, [isAuthenticated]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    // Mark notification as read first
    if (!notification.isRead) {
      dispatch(markNotificationAsRead(notification._id) as any);
    }
    
    // Sử dụng NotificationNavigationService để điều hướng
    if (isAuthenticated) {
      try {
        const token = await authService.getAccessToken();
        const notificationService = new NotificationNavigationService(API_BASE_URL || "https://growing-together-app.onrender.com/api");
        await notificationService.handleNotificationClick(notification, router, token || '');
      } catch (error) {
        // Navigation error handled silently
        // Fallback: điều hướng về Home
        router.push('/tabs/home');
      }
    }
  }, [router, dispatch, isAuthenticated]);

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead() as any);
  }, [dispatch]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: textColor }]}>Thông báo</Text>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllReadButton, { backgroundColor: primaryColor }]}
          onPress={handleMarkAllRead}
        >
          <Text style={styles.markAllReadText}>Đánh dấu đã đọc</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenWithFooter>
      <AppHeader
        title="Thông báo"
        showBackButton
        rightComponent={
          unreadCount > 0 ? (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          ) : null
        }
      />
      <View style={[styles.container, { backgroundColor }]}>
        {renderHeader()}
        <NotificationList 
          onNotificationPress={handleNotificationPress}
          navigation={router}
          token={token}
          apiBaseUrl={API_BASE_URL || "https://growing-together-app.onrender.com/api"}
        />
      </View>
    </ScreenWithFooter>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllReadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
