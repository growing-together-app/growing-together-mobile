# Notification Auto Mark Read Issue

## Vấn đề hiện tại

Từ log terminal, tôi thấy rằng:

1. **Notification được tạo thành công** (unreadCount tăng từ 0 lên 1 ở dòng 1008)
2. **Nhưng ngay lập tức bị reset về 0** (dòng 1016)
3. **Màn hình thông báo hiển thị "Bạn chưa có thông báo nào"**

## Phân tích nguyên nhân

### Frontend đã kiểm tra:

- ✅ **Không có gì gọi markAllAsRead tự động**
- ✅ **Không có gì gọi markAsRead tự động**
- ✅ **NotificationBadge polling hoạt động bình thường**
- ✅ **Race condition đã được sửa**

### Vấn đề có thể ở Backend:

1. **Backend tự động mark notification as read** sau khi tạo
2. **Có logic nào đó trong backend** đang mark all notifications as read
3. **Backend có thể có auto-mark-as-read logic** khi user active

## Log Terminal Evidence

```
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk started
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk response: {"data": {"unreadCount": 1}}
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk started
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk response: {"data": {"unreadCount": 0}}
```

**Timeline:**

- Dòng 1008: unreadCount = 1 (notification được tạo)
- Dòng 1016: unreadCount = 0 (notification bị mark as read)

## Giải pháp cần kiểm tra

### 1. Kiểm tra Backend Logic

- Xem có logic nào tự động mark notification as read không
- Kiểm tra comment controller có gọi markAsRead sau khi tạo notification không
- Xem có middleware nào tự động mark all notifications as read không

### 2. Kiểm tra API Endpoints

- `/notifications/unread-count` - có trả về đúng số lượng không
- `/notifications` - có trả về notifications không
- `/notifications/mark-all-read` - có được gọi tự động không

### 3. Kiểm tra Database

- Xem notification có được tạo trong database không
- Xem notification có bị mark as read ngay lập tức không
- Kiểm tra isRead field của notification

## Test Cases cần thực hiện

1. **Tạo comment mới** và kiểm tra:

   - Notification có được tạo trong database không
   - unreadCount có tăng không
   - Notification có bị mark as read ngay lập tức không

2. **Kiểm tra API calls**:

   - Có API call nào gọi markAsRead không
   - Có API call nào gọi markAllAsRead không
   - Có API call nào khác ảnh hưởng đến notification status không

3. **Kiểm tra Backend logs**:
   - Xem có log nào về markAsRead không
   - Xem có log nào về markAllAsRead không
   - Xem có error nào trong notification creation không

## Kết luận

Vấn đề **không phải ở frontend** mà có thể ở **backend logic**. Cần kiểm tra backend để tìm nguyên nhân notification bị mark as read tự động.
