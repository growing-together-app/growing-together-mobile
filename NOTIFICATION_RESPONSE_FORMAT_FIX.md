# Notification Response Format Fix

## Vấn đề đã phát hiện

Frontend không parse đúng format response từ backend API. Backend trả về format nested:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "data": [...notifications...],      // ← notifications ở đây
    "pagination": {...pagination...}    // ← pagination ở đây
  }
}
```

Nhưng frontend chỉ lấy `response.data` thay vì `response.data.data`.

## Giải pháp đã áp dụng

### 1. Sửa `getNotifications` method

**Trước:**

```typescript
const response = await apiService.get(
  `/notifications?page=${page}&limit=${limit}`
);
return response.data;
```

**Sau:**

```typescript
const response = await apiService.get(
  `/notifications?page=${page}&limit=${limit}`
);
// Handle nested response format: { success: true, data: { data: [...], pagination: {...} } }
if (response.data?.data?.data) {
  return {
    success: response.data.success,
    message: response.data.message,
    data: response.data.data.data,
    pagination: response.data.data.pagination,
  };
}
return response.data;
```

### 2. Sửa `getUnreadCount` method

**Trước:**

```typescript
const response = await apiService.get("/notifications/unread-count");
return response.data;
```

**Sau:**

```typescript
const response = await apiService.get("/notifications/unread-count");
// Handle nested response format: { success: true, data: { unreadCount: 0 } }
if (response.data?.data?.unreadCount !== undefined) {
  return {
    success: response.data.success,
    message: response.data.message,
    data: { unreadCount: response.data.data.unreadCount },
  };
}
return response.data;
```

### 3. Sửa `markAsRead` method

**Trước:**

```typescript
const response = await apiService.post(
  `/notifications/${sanitizedId}/mark-read`
);
return response.data;
```

**Sau:**

```typescript
const response = await apiService.post(
  `/notifications/${sanitizedId}/mark-read`
);
// Handle nested response format: { success: true, data: { _id, isRead, updatedAt } }
if (response.data?.data) {
  return {
    success: response.data.success,
    data: response.data.data,
  };
}
return response.data;
```

### 4. Sửa `markAllAsRead` method

**Trước:**

```typescript
const response = await apiService.post("/notifications/mark-all-read");
return response.data;
```

**Sau:**

```typescript
const response = await apiService.post("/notifications/mark-all-read");
// Handle nested response format: { success: true, message: "...", data: { modifiedCount: 0 } }
if (response.data?.data) {
  return {
    success: response.data.success,
    message: response.data.message,
    data: response.data.data,
  };
}
return response.data;
```

### 5. Sửa `deleteNotification` method

**Trước:**

```typescript
const response = await apiService.delete(`/notifications/${sanitizedId}`);
return response.data;
```

**Sau:**

```typescript
const response = await apiService.delete(`/notifications/${sanitizedId}`);
// Handle nested response format: { success: true, message: "...", data: { _id, isDeleted } }
if (response.data?.data) {
  return {
    success: response.data.success,
    message: response.data.message,
    data: response.data.data,
  };
}
return response.data;
```

## Kết quả

- ✅ **Frontend giờ đây parse đúng format response từ backend**
- ✅ **Notification badge sẽ hiển thị đúng unread count**
- ✅ **Notification list sẽ hiển thị đúng notifications**
- ✅ **Tất cả notification operations sẽ hoạt động đúng**

## Test

Sau khi sửa, test lại:

1. Tạo comment mới
2. Kiểm tra notification badge có hiển thị unread count không
3. Kiểm tra notification list có hiển thị notifications không
4. Test mark as read, mark all as read, delete notification
