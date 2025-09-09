# Backend Comment Notification Issue

## Vấn đề hiện tại

Backend code bạn gửi là **notification controller** - chỉ xử lý việc lấy, đánh dấu và xóa thông báo.

**Vấn đề chính là ở COMMENT CONTROLLER** - nơi tạo thông báo khi có comment mới.

### Hiện tại:

- ✅ **Backend có tạo thông báo** khi có comment
- ✅ **Chỉ người tạo post (chính chủ) nhận được thông báo**
- ❌ **Các thành viên khác trong nhóm KHÔNG nhận được thông báo**

## Nguyên nhân

**Comment controller** hiện tại chỉ tạo notification cho:

- **Người tạo post** (author/creator)
- **Không gửi cho các thành viên khác trong nhóm**

## Cần kiểm tra Backend

### 1. Comment Controller

Tìm file comment controller (có thể là `controllers/commentController.js` hoặc tương tự) và kiểm tra:

```javascript
// ❌ LOGIC HIỆN TẠI (CHỈ GỬI CHO NGƯỜI TẠO POST):
exports.createComment = async (req, res) => {
  // ... tạo comment

  // Chỉ tạo notification cho người tạo post
  await Notification.create({
    recipient: targetContent.createdBy, // Chỉ người tạo post
    sender: userId,
    type: "comment",
    message: `${user.firstName} đã bình luận về ${targetType} của bạn`,
    targetType,
    targetId,
    childId: targetContent.childId,
  });
};
```

### 2. Cần sửa thành:

```javascript
// ✅ LOGIC MỚI (GỬI CHO TẤT CẢ THÀNH VIÊN TRONG NHÓM):
exports.createComment = async (req, res) => {
  // ... tạo comment

  // Lấy tất cả thành viên trong nhóm
  const familyGroup = await FamilyGroup.findById(targetContent.familyGroupId);
  const groupMembers = familyGroup.members; // [member1, member2, ...]

  // Tạo notification cho tất cả thành viên (trừ người comment)
  const notifications = [];
  for (const member of groupMembers) {
    if (member.userId.toString() !== userId.toString()) {
      notifications.push({
        recipient: member.userId,
        sender: userId,
        type: "comment",
        message: `${user.firstName} đã bình luận về ${targetType}`,
        targetType,
        targetId,
        childId: targetContent.childId,
        familyGroupId: targetContent.familyGroupId,
      });
    }
  }

  // Tạo tất cả notifications
  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }
};
```

## Các bước cần làm

### 1. Tìm Comment Controller

```bash
# Tìm file comment controller
find backend/ -name "*comment*" -type f
grep -r "createComment" backend/
```

### 2. Kiểm tra logic hiện tại

- Xem có tạo notification không
- Xem gửi cho ai (chỉ người tạo post hay tất cả thành viên)

### 3. Sửa logic

- Lấy tất cả thành viên trong nhóm
- Tạo notification cho tất cả thành viên (trừ người comment)
- Đảm bảo không gửi duplicate notifications

### 4. Test

- Tạo comment mới
- Kiểm tra tất cả thành viên có nhận được thông báo không

## Kết luận

Vấn đề **không phải ở notification controller** mà ở **comment controller**. Cần sửa logic tạo notification để gửi cho **tất cả thành viên trong nhóm**, không chỉ người tạo post.
