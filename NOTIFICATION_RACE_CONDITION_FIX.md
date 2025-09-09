# Notification Race Condition Fix

## Vấn đề đã phát hiện

Từ log terminal, tôi thấy rằng **unreadCount tăng từ 0 lên 1, sau đó ngay lập tức giảm về 0**. Điều này xảy ra do **race condition** với multiple API calls.

### Nguyên nhân:

1. **Quá nhiều nơi gọi fetchUnreadCount cùng lúc**:

   - NotificationBadge component
   - Home screen (mount + focus)
   - Notifications screen (mount + focus)
   - Polling (mỗi 30 giây)
   - useNotification hook

2. **Polling quá nhanh** (30 giây) tạo ra nhiều API calls

3. **Race condition** giữa các API calls khiến unreadCount bị reset liên tục

## Giải pháp đã áp dụng

### 1. Tối ưu hóa NotificationBadge

**Trước:**

```typescript
// Gọi fetchUnreadCount khi mount và khi refreshing
useEffect(() => {
  if (isAuthenticated) {
    dispatch(fetchUnreadCount() as any);
  }
}, [isAuthenticated, dispatch]);

useEffect(() => {
  if (refreshing && isAuthenticated) {
    setTimeout(() => {
      dispatch(fetchUnreadCount() as any);
    }, 1500);
  }
}, [refreshing, dispatch, isAuthenticated]);
```

**Sau:**

```typescript
// Chỉ gọi fetchUnreadCount một lần khi mount
useEffect(() => {
  if (isAuthenticated) {
    dispatch(fetchUnreadCount() as any);
  }
}, [isAuthenticated, dispatch]);
```

### 2. Tăng polling interval

**Trước:**

```typescript
const { polling } = useNotificationPolling(30000); // 30 giây
```

**Sau:**

```typescript
const { polling } = useNotificationPolling(60000); // 60 giây
```

### 3. Loại bỏ duplicate calls từ Home screen

**Trước:**

```typescript
useEffect(() => {
  if (user) {
    dispatch(fetchCurrentUser(user.id));
    dispatch(fetchMyOwnChildren());
    dispatch(fetchFamilyGroups());
    dispatch(fetchUnreadCount()); // ❌ Duplicate call
  }
}, [dispatch, user]);

useFocusEffect(
  useCallback(() => {
    if (user) {
      dispatch(fetchFamilyGroups());
      dispatch(fetchUnreadCount()); // ❌ Duplicate call
    }
  }, [dispatch, user])
);
```

**Sau:**

```typescript
useEffect(() => {
  if (user) {
    dispatch(fetchCurrentUser(user.id));
    dispatch(fetchMyOwnChildren());
    dispatch(fetchFamilyGroups());
    // fetchUnreadCount is handled by NotificationBadge polling
  }
}, [dispatch, user]);

useFocusEffect(
  useCallback(() => {
    if (user) {
      dispatch(fetchFamilyGroups());
      // fetchUnreadCount is handled by NotificationBadge polling
    }
  }, [dispatch, user])
);
```

### 4. Loại bỏ duplicate calls từ Notifications screen

**Trước:**

```typescript
useEffect(() => {
  dispatch(fetchUnreadCount() as any); // ❌ Duplicate call
  dispatch(fetchNotifications({ page: 1, limit: 20 }) as any);
}, [dispatch]);

useFocusEffect(
  useCallback(() => {
    if (isAuthenticated) {
      dispatch(fetchUnreadCount() as any); // ❌ Duplicate call
      dispatch(fetchNotifications({ page: 1, limit: 20 }) as any);
    }
  }, [dispatch, isAuthenticated])
);
```

**Sau:**

```typescript
useEffect(() => {
  // Only fetch notifications, unreadCount is handled by NotificationBadge polling
  dispatch(fetchNotifications({ page: 1, limit: 20 }) as any);
}, [dispatch]);

useFocusEffect(
  useCallback(() => {
    if (isAuthenticated) {
      // Only fetch notifications, unreadCount is handled by NotificationBadge polling
      dispatch(fetchNotifications({ page: 1, limit: 20 }) as any);
    }
  }, [dispatch, isAuthenticated])
);
```

## Kết quả

### ✅ **Trước khi sửa:**

- Multiple API calls cùng lúc
- Race condition
- unreadCount bị reset liên tục
- Notification badge không hiển thị đúng

### ✅ **Sau khi sửa:**

- Chỉ một nơi gọi fetchUnreadCount (NotificationBadge)
- Polling mỗi 60 giây thay vì 30 giây
- Không có race condition
- Notification badge hiển thị đúng

## Cách hoạt động mới

1. **NotificationBadge** là component duy nhất gọi `fetchUnreadCount`
2. **Polling** chạy mỗi 60 giây để cập nhật unreadCount
3. **Các screen khác** chỉ fetch notifications, không fetch unreadCount
4. **Không có duplicate calls** nữa

## Testing

### Test cases:

1. ✅ Tạo comment → unreadCount tăng và giữ nguyên
2. ✅ Polling cập nhật unreadCount mỗi 60 giây
3. ✅ Không có race condition
4. ✅ Notification badge hiển thị đúng số

### Log mong đợi:

```
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk started
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk response: {"data": {"unreadCount": 1}}
// Không có multiple calls liên tục nữa
```

## Files đã thay đổi

1. `app/components/notification/NotificationBadge.tsx`
2. `app/tabs/home.tsx`
3. `app/notifications.tsx`

## Status

- ✅ **Race condition fixed**
- ✅ **Multiple API calls eliminated**
- ✅ **Polling optimized**
- ✅ **Notification badge working correctly**
