# Backend Fix: Comment Notifications for All Group Members

## Vấn đề hiện tại

Hiện tại, khi có người bình luận trên post trong family group, **chỉ có người tạo post mới nhận được thông báo**. Các thành viên khác trong nhóm không nhận được thông báo, mặc dù họ có quyền xem post đó.

### Chứng minh vấn đề:

- Từ log terminal: `unreadCount` tăng từ 0 lên 1 khi có comment, sau đó giảm về 0
- Chỉ người tạo post thấy thông báo
- Các thành viên khác trong nhóm không nhận được thông báo

## Nguyên nhân

Backend comment controller hiện tại chỉ tạo notification cho:

- **Người tạo post** (author/creator)
- **Không gửi cho các thành viên khác trong nhóm**

## Giải pháp

### 1. Cập nhật logic tạo notification trong comment controller

Cần sửa đổi logic để gửi thông báo cho **tất cả thành viên có quyền xem post**:

```javascript
// Trong comment controller, sau khi tạo comment thành công
const createCommentNotifications = async (
  comment,
  targetType,
  targetId,
  commenterId
) => {
  try {
    // 1. Lấy thông tin về post/content được comment
    let targetContent = null;
    let familyGroupId = null;

    switch (targetType) {
      case "memory":
        targetContent = await Memory.findById(targetId).populate("childId");
        familyGroupId = targetContent?.familyGroupId;
        break;
      case "promptResponse":
        targetContent = await PromptResponse.findById(targetId).populate(
          "childId"
        );
        familyGroupId = targetContent?.familyGroupId;
        break;
      case "healthRecord":
        targetContent = await HealthRecord.findById(targetId).populate(
          "childId"
        );
        familyGroupId = targetContent?.familyGroupId;
        break;
      case "growthRecord":
        targetContent = await GrowthRecord.findById(targetId).populate(
          "childId"
        );
        familyGroupId = targetContent?.familyGroupId;
        break;
    }

    if (!targetContent || !familyGroupId) {
      console.log("No target content or family group found for notification");
      return;
    }

    // 2. Lấy tất cả thành viên trong family group
    const familyGroup = await FamilyGroup.findById(familyGroupId).populate(
      "members.userId",
      "firstName lastName avatar"
    );

    if (!familyGroup) {
      console.log("Family group not found for notification");
      return;
    }

    // 3. Lấy thông tin người comment
    const commenter = await User.findById(commenterId);
    if (!commenter) {
      console.log("Commenter not found for notification");
      return;
    }

    // 4. Tạo notification cho tất cả thành viên (trừ người comment)
    const notifications = [];

    for (const member of familyGroup.members) {
      const memberUserId = member.userId._id || member.userId;

      // Bỏ qua người comment
      if (memberUserId.toString() === commenterId.toString()) {
        continue;
      }

      // Kiểm tra quyền xem post
      const canViewPost = await checkPostViewPermission(
        targetContent,
        memberUserId,
        familyGroup
      );

      if (canViewPost) {
        notifications.push({
          recipient: memberUserId,
          sender: commenterId,
          type: "comment",
          title: "Bình luận mới",
          message: `${commenter.firstName} ${commenter.lastName} đã bình luận về bài viết trong nhóm ${familyGroup.name}`,
          targetType: targetType,
          targetId: targetId,
          childId: targetContent.childId,
          familyGroupId: familyGroupId,
          isRead: false,
        });
      }
    }

    // 5. Tạo tất cả notifications
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} comment notifications`);
    }
  } catch (error) {
    console.error("Error creating comment notifications:", error);
  }
};

// Helper function để kiểm tra quyền xem post
const checkPostViewPermission = async (targetContent, userId, familyGroup) => {
  try {
    // Nếu post là public, tất cả thành viên đều có thể xem
    if (targetContent.visibility === "public") {
      return true;
    }

    // Nếu post là private, chỉ người tạo có thể xem
    if (targetContent.visibility === "private") {
      const creatorId = targetContent.createdBy || targetContent.parentId;
      return creatorId.toString() === userId.toString();
    }

    // Mặc định: chỉ người tạo có thể xem
    return false;
  } catch (error) {
    console.error("Error checking post view permission:", error);
    return false;
  }
};
```

### 2. Cập nhật comment controller

```javascript
// Trong comment controller
exports.createComment = asyncHandler(async (req, res) => {
  const { content, targetType, targetId, parentCommentId } = req.body;
  const userId = req.user._id;

  // Tạo comment
  const comment = await Comment.create({
    content,
    targetType,
    targetId,
    user: userId,
    parentComment: parentCommentId || null,
  });

  // Populate user info
  await comment.populate("user", "firstName lastName avatar");

  // Tạo notifications cho tất cả thành viên có quyền xem
  // Chạy bất đồng bộ để không ảnh hưởng đến response
  setImmediate(() => {
    createCommentNotifications(comment, targetType, targetId, userId);
  });

  return sendResponse(
    res,
    StatusCodes.CREATED,
    { comment },
    "Comment created successfully"
  );
});
```

### 3. Cập nhật reply notification logic

```javascript
// Khi tạo reply, cũng cần gửi notification cho tất cả thành viên
const createReplyNotifications = async (reply, parentComment, commenterId) => {
  try {
    // Lấy thông tin về post gốc từ parent comment
    const targetContent = await getTargetContent(
      parentComment.targetType,
      parentComment.targetId
    );

    if (!targetContent) return;

    // Lấy family group
    const familyGroup = await FamilyGroup.findById(
      targetContent.familyGroupId
    ).populate("members.userId", "firstName lastName avatar");

    if (!familyGroup) return;

    // Lấy thông tin người reply
    const commenter = await User.findById(commenterId);
    if (!commenter) return;

    // Tạo notifications cho tất cả thành viên (trừ người reply)
    const notifications = [];

    for (const member of familyGroup.members) {
      const memberUserId = member.userId._id || member.userId;

      // Bỏ qua người reply
      if (memberUserId.toString() === commenterId.toString()) {
        continue;
      }

      // Kiểm tra quyền xem post
      const canViewPost = await checkPostViewPermission(
        targetContent,
        memberUserId,
        familyGroup
      );

      if (canViewPost) {
        notifications.push({
          recipient: memberUserId,
          sender: commenterId,
          type: "comment",
          title: "Trả lời bình luận",
          message: `${commenter.firstName} ${commenter.lastName} đã trả lời bình luận trong nhóm ${familyGroup.name}`,
          targetType: parentComment.targetType,
          targetId: parentComment.targetId,
          childId: targetContent.childId,
          familyGroupId: targetContent.familyGroupId,
          isRead: false,
        });
      }
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} reply notifications`);
    }
  } catch (error) {
    console.error("Error creating reply notifications:", error);
  }
};
```

## Kết quả mong đợi

Sau khi cập nhật backend:

1. **Tất cả thành viên trong nhóm** sẽ nhận được thông báo khi có comment mới
2. **Chỉ gửi cho thành viên có quyền xem post** (dựa trên visibility setting)
3. **Không gửi cho người comment** (tránh spam)
4. **Hoạt động cho cả comment và reply**

## Testing

### Test cases cần kiểm tra:

1. **Comment trên public post**: Tất cả thành viên nhận thông báo
2. **Comment trên private post**: Chỉ người tạo post nhận thông báo
3. **Reply trên comment**: Tất cả thành viên có quyền xem nhận thông báo
4. **Người comment không nhận thông báo**: Tránh spam
5. **Thành viên không có quyền xem**: Không nhận thông báo

### Manual testing:

1. Tạo comment trên memory trong family group
2. Kiểm tra tất cả thành viên nhận được thông báo
3. Kiểm tra người comment không nhận thông báo
4. Test với post private vs public

## Lưu ý quan trọng

1. **Performance**: Sử dụng `setImmediate()` để tạo notification bất đồng bộ
2. **Error handling**: Không để lỗi notification ảnh hưởng đến việc tạo comment
3. **Permission check**: Luôn kiểm tra quyền xem post trước khi gửi notification
4. **Avoid spam**: Không gửi notification cho chính người comment

## Status

- ✅ **Frontend**: Hoàn thành 100%
- ⏳ **Backend**: Cần cập nhật logic tạo notification
- ⏳ **Testing**: Cần test với backend mới
