# Reply Save Fix - Comment System

## Vấn đề

Bình luận chính (main comment) được lưu thành công, nhưng reply (trả lời bình luận) không được lưu hoặc không hiển thị.

## Nguyên nhân có thể

1. **Error handling không đầy đủ** - Lỗi API không được log chi tiết
2. **State update không đúng** - Reply không được thêm vào state
3. **UI không re-render** - Reply được lưu nhưng không hiển thị
4. **Logic xử lý reply phức tạp** - Có thể có race condition

## Giải pháp đã thực hiện

### 1. Cải thiện Error Handling

- **File**: `app/components/CommentModal.tsx` và `app/components/CommentSystem.tsx`
- **Thay đổi**:
  - Thêm console.log chi tiết để debug
  - Cải thiện error message với thông tin cụ thể
  - Log tất cả các bước trong quá trình tạo reply

### 2. Sửa Logic State Update

- **CommentModal**:

  - Thêm `onCommentAdded?.(comment)` để notify parent component
  - Thêm force refresh comments list sau khi tạo reply
  - Cải thiện logic update state

- **CommentSystem**:
  - Sửa logic xử lý reply trong `onCommentAdded` callback
  - Đảm bảo reply được thêm vào đúng parent comment
  - Cải thiện state management

### 3. Debug Logging

- Thêm console.log ở các điểm quan trọng:
  - Khi bắt đầu tạo reply
  - Khi API call thành công
  - Khi update state
  - Khi hoàn thành process

### 4. Force Refresh

- Thêm `fetchComments(1, true)` sau khi tạo reply để đảm bảo UI được cập nhật

## Code Changes

### CommentModal.tsx

```javascript
const handleSubmitReply = async () => {
  if (!replyComment.trim() || submitting || !replyingTo) return;

  setSubmitting(true);
  try {
    console.log('Creating reply:', {
      content: replyComment.trim(),
      targetType,
      targetId,
      parentCommentId: replyingTo,
    });

    const comment = await commentService.createComment({
      content: replyComment.trim(),
      targetType: targetType as any,
      targetId,
      parentCommentId: replyingTo,
    });

    console.log('Reply created successfully:', comment);

    // Clear reply input
    setReplyComment('');

    // Add the new reply to the existing comment
    setComments(prev => prev.map(c => {
      if (c._id === replyingTo) {
        const updatedComment = {
          ...c,
          replies: [...(c.replies || []), comment]
        };
        console.log('Updated comment with reply:', updatedComment);
        return updatedComment;
      }
      return c;
    }));

    // Force refresh the comments list to show the new reply
    setTimeout(() => {
      fetchComments(1, true);
    }, 500);

    // Close reply input
    setShowReplyInput(false);
    setReplyingTo(null);

    // Notify parent component about the new reply
    onCommentAdded?.(comment);

    // Refresh notification count after adding reply
    setTimeout(() => {
      dispatch(refreshNotificationCount());
    }, 1000);

    console.log('Reply submitted successfully');
  } catch (error: any) {
    console.error('Error creating reply:', error);
    Alert.alert(
      'Lỗi',
      `Không thể tạo bình luận. ${error.message || 'Vui lòng thử lại.'}`
    );
  } finally {
    setSubmitting(false);
  }
};
```

### CommentSystem.tsx

```javascript
// CommentInput component
const handleSubmit = async () => {
  if (!content.trim() || loading) return;

  setLoading(true);
  try {
    console.log('Creating comment/reply:', {
      content: content.trim(),
      targetType,
      targetId,
      parentCommentId,
    });

    const newComment = await commentService.createComment({
      content: content.trim(),
      targetType: targetType as any,
      targetId,
      parentCommentId,
    });

    console.log('Comment/reply created successfully:', newComment);
    setContent("");
    onCommentAdded(newComment);
    onCancel?.();
  } catch (error: any) {
    console.error("Error creating comment:", error);
    Alert.alert(
      "Lỗi",
      `Không thể tạo bình luận. ${error.message || 'Vui lòng thử lại.'}`
    );
  } finally {
    setLoading(false);
  }
};

// Reply handling
{showReplyInput && replyingTo && (
  <CommentInput
    targetType={targetType}
    targetId={targetId}
    parentCommentId={replyingTo}
    onCommentAdded={(newReply) => {
      console.log('Reply added in CommentSystem:', newReply);
      // Add the reply to the parent comment
      setComments(prev => prev.map(comment => {
        if (comment._id === replyingTo) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply]
          };
        }
        return comment;
      }));
      setShowReplyInput(false);
      setReplyingTo(null);
    }}
    onCancel={() => {
      setShowReplyInput(false);
      setReplyingTo(null);
    }}
    placeholder="Viết reply..."
  />
)}
```

## Files đã thay đổi

1. `app/components/CommentModal.tsx`

   - Cải thiện `handleSubmitReply` function
   - Thêm debug logging
   - Cải thiện error handling
   - Thêm force refresh

2. `app/components/CommentSystem.tsx`

   - Cải thiện `handleSubmit` trong CommentInput
   - Sửa logic xử lý reply
   - Thêm debug logging
   - Cải thiện error handling

3. `test-reply-functionality.js` (mới)
   - Hướng dẫn test và debug reply functionality

## Cách test

1. **Test CommentModal**:

   - Mở modal bình luận
   - Tạo comment chính
   - Tap "Trả lời" trên comment
   - Nhập reply và gửi
   - Kiểm tra console logs

2. **Test CommentSystem**:

   - Mở trang có comment system
   - Tạo comment chính
   - Tap "Trả lời" trên comment
   - Nhập reply và gửi
   - Kiểm tra console logs

3. **Debug nếu có lỗi**:
   - Kiểm tra network requests
   - Kiểm tra console logs
   - Kiểm tra state updates
   - Kiểm tra backend response

## Console Logs để theo dõi

### CommentModal

- `"Creating reply: {...}"`
- `"Reply created successfully: {...}"`
- `"Updated comment with reply: {...}"`
- `"Reply submitted successfully"`

### CommentSystem

- `"Creating comment/reply: {...}"`
- `"Comment/reply created successfully: {...}"`
- `"Reply added in CommentSystem: {...}"`

## Kết quả mong đợi

- ✅ Reply được tạo thành công
- ✅ Reply hiển thị dưới comment gốc
- ✅ Console logs chi tiết để debug
- ✅ Error handling tốt hơn
- ✅ UI được cập nhật đúng

## Lưu ý

- Console logs sẽ giúp debug nếu vẫn có vấn đề
- Force refresh đảm bảo UI được cập nhật
- Error messages chi tiết hơn
- State management được cải thiện
