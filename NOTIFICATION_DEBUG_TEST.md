# Notification Debug Test

## Vấn đề hiện tại

Từ log terminal, tôi thấy rằng **unreadCount luôn là 0** - nghĩa là **không có notification nào được tạo** hoặc **tất cả notification đều bị mark as read ngay lập tức**.

## Test để kiểm tra

### 1. Test Backend API trực tiếp

```bash
# Test tạo comment
curl -X POST "https://growing-together-app.onrender.com/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Test comment for notification",
    "targetType": "memory",
    "targetId": "68afbbf85c5bbec70babaaf0",
    "parentCommentId": null
  }'

# Test unread count ngay sau khi tạo comment
curl -X GET "https://growing-together-app.onrender.com/api/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test notifications list
curl -X GET "https://growing-together-app.onrender.com/api/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Kiểm tra Backend Logs

Cần kiểm tra backend logs để xem:

- Comment có được tạo thành công không
- Notification có được tạo không
- Có error nào trong notification creation không

### 3. Kiểm tra Database

Cần kiểm tra database để xem:

- Comment có được lưu trong database không
- Notification có được tạo trong database không
- Notification có bị mark as read ngay lập tức không

## Các khả năng

### 1. Backend không tạo notification

- Comment controller không có logic tạo notification
- Notification service không được gọi
- Có error trong notification creation

### 2. Backend tạo notification nhưng mark as read ngay lập tức

- Có middleware tự động mark as read
- Có logic nào đó mark all notifications as read
- Database trigger tự động mark as read

### 3. Frontend không gọi đúng API

- API endpoint không đúng
- Request format không đúng
- Authentication không đúng

## Giải pháp

### 1. Kiểm tra Backend Code

- Xem comment controller có tạo notification không
- Xem có middleware nào mark as read không
- Xem có error nào trong logs không

### 2. Test API trực tiếp

- Test tạo comment
- Test unread count
- Test notifications list

### 3. Kiểm tra Database

- Xem comment có được lưu không
- Xem notification có được tạo không
- Xem notification status như thế nào

## Kết luận

Vấn đề có thể là:

1. **Backend không tạo notification** khi có comment
2. **Backend tạo notification nhưng mark as read ngay lập tức**
3. **Frontend không gọi đúng API**

Cần kiểm tra backend để tìm nguyên nhân thực sự.
