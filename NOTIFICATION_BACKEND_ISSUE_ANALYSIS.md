# Notification Backend Issue Analysis

## Vấn đề hiện tại

Mặc dù backend đã được cập nhật để **không tự động mark notification as read** trong `getNotificationNavigation` endpoint, nhưng vấn đề vẫn tồn tại:

```
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk response: {"data": {"unreadCount": 1}}
LOG  🔄 [NotificationSlice] fetchUnreadCount thunk response: {"data": {"unreadCount": 0}}
```

## Phân tích Backend Code

### ✅ Đã sửa:

- `getNotificationNavigation` endpoint không tự động mark as read nữa
- Comment: `// KHÔNG tự động đánh dấu notification là đã đọc`

### ❌ Vấn đề có thể còn tồn tại:

1. **Comment Controller** có thể vẫn có logic mark as read
2. **Middleware** có thể tự động mark all notifications as read
3. **Database trigger** có thể tự động mark as read
4. **Other endpoints** có thể gọi markAsRead

## Cần kiểm tra Backend

### 1. Comment Controller

```javascript
// Kiểm tra xem có logic này không:
exports.createComment = async (req, res) => {
  // ... tạo comment
  // ... tạo notification

  // ❌ CÓ THỂ CÓ LOGIC NÀY:
  await markAllNotificationsAsRead(userId); // <-- VẤN ĐỀ Ở ĐÂY
};
```

### 2. Middleware

```javascript
// Kiểm tra xem có middleware nào như này không:
app.use("/api/notifications", (req, res, next) => {
  // ❌ CÓ THỂ CÓ LOGIC NÀY:
  if (req.method === "GET") {
    markAllNotificationsAsRead(req.user.id);
  }
  next();
});
```

### 3. Database Triggers

```javascript
// Kiểm tra xem có trigger nào như này không:
db.notifications.watch().on("change", (change) => {
  if (change.operationType === "insert") {
    // ❌ CÓ THỂ CÓ LOGIC NÀY:
    markAllNotificationsAsRead(change.fullDocument.recipient);
  }
});
```

## Giải pháp

### 1. Kiểm tra Comment Controller

Tìm file comment controller và kiểm tra xem có gọi `markAllNotificationsAsRead` không:

```bash
# Tìm trong backend code
grep -r "markAllNotificationsAsRead" backend/
grep -r "markAsRead" backend/
```

### 2. Kiểm tra Middleware

Tìm middleware có thể tự động mark as read:

```bash
# Tìm middleware
grep -r "middleware" backend/
grep -r "app.use" backend/
```

### 3. Kiểm tra Database

Kiểm tra xem có trigger hoặc stored procedure nào không:

```bash
# Kiểm tra database
grep -r "trigger" backend/
grep -r "watch" backend/
```

### 4. Test API Endpoints

Test từng endpoint để xem endpoint nào gây ra vấn đề:

```bash
# Test unread count
curl -X GET "https://growing-together-app.onrender.com/api/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test notifications list
curl -X GET "https://growing-together-app.onrender.com/api/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Kết luận

Vấn đề **không phải ở frontend** mà có thể ở **backend logic khác**. Cần kiểm tra:

1. **Comment controller** có gọi markAsRead không
2. **Middleware** có tự động mark as read không
3. **Database triggers** có tự động mark as read không
4. **Other endpoints** có gọi markAsRead không

Backend cần được kiểm tra toàn bộ để tìm nguyên nhân notification bị mark as read tự động.
