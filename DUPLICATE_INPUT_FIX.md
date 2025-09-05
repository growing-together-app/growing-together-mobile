# Duplicate Input Fix - Comment System

## Vấn đề

Khi người dùng trả lời bình luận, có 2 ô input hiển thị cùng lúc:

1. Ô "Trả lời bình luận" (reply input) ở giữa màn hình
2. Ô "Bình luận dưới tên Bạn" (main comment input) ở dưới cùng

Điều này gây khó chịu cho người dùng vì có 2 ô nhập cùng lúc, tạo confusion.

## Giải pháp đã thực hiện

### 1. Conditional Rendering cho Main Comment Input

- **File**: `app/components/CommentModal.tsx`
- **Thay đổi**:
  - Wrap main comment input với condition `{!showReplyInput && (...)}`
  - Chỉ hiển thị main comment input khi KHÔNG đang reply
  - Khi đang reply, chỉ hiển thị reply input

### 2. Conditional Rendering cho CommentSystem

- **File**: `app/components/CommentSystem.tsx`
- **Thay đổi**:
  - Tương tự như CommentModal
  - Wrap main CommentInput với condition `{!showReplyInput && (...)}`

### 3. Cải thiện UX Flow

- **Thêm nút "Thêm bình luận"** trong reply header
- Cho phép người dùng chuyển từ reply mode về comment mode
- Cải thiện visual hierarchy

### 4. Enhanced Reply Header

- **CommentModal**: Thêm `replyHeader` với nút "Thêm bình luận"
- **CommentSystem**: Thêm `replyHeader` trong CommentInput component
- Styling nhất quán cho cả 2 components

## Cấu hình chi tiết

### CommentModal

```javascript
{
  /* Reply Input */
}
{
  showReplyInput && replyingTo && (
    <View style={styles.replyInputContainer}>
      <View style={styles.replyHeader}>
        <Text style={styles.replyLabel}>Trả lời bình luận</Text>
        <TouchableOpacity
          style={styles.addCommentButton}
          onPress={() => {
            setShowReplyInput(false);
            setReplyingTo(null);
            setReplyComment("");
          }}
        >
          <Text style={styles.addCommentButtonText}>+ Thêm bình luận</Text>
        </TouchableOpacity>
      </View>
      {/* Reply input content */}
    </View>
  );
}

{
  /* Main Comment Input - Only show when not replying */
}
{
  !showReplyInput && (
    <View style={styles.inputContainer}>
      {/* Main comment input content */}
    </View>
  );
}
```

### CommentSystem

```javascript
{
  /* Reply Input */
}
{
  showReplyInput && replyingTo && (
    <CommentInput
      targetType={targetType}
      targetId={targetId}
      parentCommentId={replyingTo}
      onCommentAdded={handleCommentAdded}
      onCancel={() => {
        setShowReplyInput(false);
        setReplyingTo(null);
      }}
      placeholder="Viết reply..."
    />
  );
}

{
  /* Main Comment Input - Only show when not replying */
}
{
  !showReplyInput && (
    <CommentInput
      targetType={targetType}
      targetId={targetId}
      onCommentAdded={handleCommentAdded}
    />
  );
}
```

## Files đã thay đổi

1. `app/components/CommentModal.tsx`

   - Thêm conditional rendering cho main comment input
   - Thêm reply header với nút "Thêm bình luận"
   - Cải thiện UX flow

2. `app/components/CommentSystem.tsx`
   - Thêm conditional rendering cho main CommentInput
   - Cải thiện CommentInput component với reply header
   - Thêm styles cho reply header

## Styles mới

```javascript
replyHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
replyLabel: {
  fontSize: 12,
  color: '#666',
},
addCommentButton: {
  paddingVertical: 4,
  paddingHorizontal: 8,
  backgroundColor: '#f0f0f0',
  borderRadius: 4,
},
addCommentButtonText: {
  fontSize: 12,
  color: Colors.light.tint,
  fontWeight: '500',
},
```

## Cách test

1. **Test CommentModal**:

   - Mở modal bình luận
   - Tap "Trả lời" trên một comment
   - Kiểm tra: chỉ có 1 ô input (reply input)
   - Tap "Thêm bình luận" để chuyển về main input
   - Kiểm tra: chỉ có 1 ô input (main input)

2. **Test CommentSystem**:
   - Mở trang có comment system
   - Tap "Trả lời" trên một comment
   - Kiểm tra: chỉ có 1 ô input (reply input)
   - Tap "Thêm bình luận" để chuyển về main input
   - Kiểm tra: chỉ có 1 ô input (main input)

## Kết quả mong đợi

- ✅ Chỉ hiển thị 1 ô input tại một thời điểm
- ✅ UX flow rõ ràng và dễ hiểu
- ✅ Có thể chuyển đổi giữa reply mode và comment mode
- ✅ Visual hierarchy tốt hơn
- ✅ Không còn confusion về việc có 2 ô input

## Lưu ý

- Conditional rendering đảm bảo chỉ 1 ô input hiển thị
- Nút "Thêm bình luận" giúp người dùng dễ dàng chuyển mode
- Styling nhất quán giữa CommentModal và CommentSystem
- Keyboard behavior vẫn hoạt động tốt với 1 ô input
