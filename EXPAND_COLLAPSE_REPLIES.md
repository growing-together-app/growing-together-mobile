# Expand/Collapse Replies Feature

## Tổng quan

Đã implement tính năng expand/collapse replies giống Facebook, giúp UI gọn gàng hơn và dễ đọc hơn. Users có thể mở/đóng replies theo ý muốn.

## Tính năng chính

### 1. View Replies Button

- **Hiển thị số lượng replies**: "Xem 3 trả lời" hoặc "Ẩn 3 trả lời"
- **Icon động**: Chevron up/down để chỉ trạng thái expand/collapse
- **Styling đẹp**: Background màu xám nhạt, border radius

### 2. Auto-expand Logic

- **Level 0**: Auto-expand (hiển thị replies mặc định)
- **Level 1+**: Auto-collapse (ẩn replies mặc định)
- **Auto-expand khi có reply mới**: Tự động mở khi có reply mới được thêm

### 3. Performance Optimization

- **Conditional rendering**: Chỉ render replies khi được expand
- **State management**: Quản lý state expand/collapse cho từng comment
- **Memory efficient**: Không render replies không cần thiết

## Implementation Details

### State Management

```typescript
const [showReplies, setShowReplies] = useState(level === 0);

// Auto-expand when new replies are added
useEffect(() => {
  if (comment.replies && comment.replies.length > 0 && level === 0) {
    setShowReplies(true);
  }
}, [comment.replies?.length, level]);
```

### Toggle Function

```typescript
const toggleReplies = () => {
  setShowReplies(!showReplies);
};
```

### UI Components

```typescript
{
  /* View Replies Button */
}
<TouchableOpacity style={styles.viewRepliesButton} onPress={toggleReplies}>
  <Ionicons
    name={showReplies ? "chevron-up" : "chevron-down"}
    size={16}
    color="#1877f2"
  />
  <Text style={styles.viewRepliesText}>
    {showReplies ? "Ẩn" : "Xem"} {comment.replies?.length || 0} trả lời
  </Text>
</TouchableOpacity>;

{
  /* Replies Container */
}
{
  showReplies && (
    <View style={[styles.repliesContainer, { maxWidth: "100%" }]}>
      {comment.replies?.map((reply, index) => (
        <CommentItem
          key={`${reply._id}-${index}`}
          comment={reply}
          currentUserId={currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          level={effectiveLevel + 1}
        />
      ))}
    </View>
  );
}
```

## Styling

### View Replies Button

```typescript
viewRepliesButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 8,
  marginBottom: 4,
  borderRadius: 4,
  backgroundColor: '#f8f9fa',
}
```

### View Replies Text

```typescript
viewRepliesText: {
  fontSize: 12,
  color: '#1877f2',
  fontWeight: '500',
  marginLeft: 4,
}
```

### Replies Section

```typescript
repliesSection: {
  marginTop: 8,
}
```

## User Experience

### Default Behavior

- **Main comments (Level 0)**: Auto-expand để hiển thị replies
- **Nested replies (Level 1+)**: Auto-collapse để tránh clutter
- **New replies**: Auto-expand khi có reply mới

### Interaction

- **Click "Xem X trả lời"**: Mở replies
- **Click "Ẩn X trả lời"**: Đóng replies
- **Icon chevron**: Chỉ trạng thái hiện tại
- **Smooth transition**: Không có animation nhưng responsive

## Performance Benefits

### 1. Reduced Rendering

- **Conditional rendering**: Chỉ render replies khi cần
- **Memory efficient**: Tiết kiệm memory cho deep nesting
- **Faster initial load**: Không render tất cả replies ngay

### 2. Better UX

- **Cleaner interface**: UI gọn gàng hơn
- **Easier navigation**: Dễ đọc và navigate
- **Progressive disclosure**: Hiển thị thông tin theo nhu cầu

### 3. Scalability

- **Handles large comment threads**: Có thể xử lý comment threads lớn
- **Deep nesting support**: Hỗ trợ nested replies sâu
- **Responsive design**: Hoạt động tốt trên mọi thiết bị

## Testing

### Manual Testing Steps

1. **Tạo comment** với nhiều replies
2. **Kiểm tra auto-expand** cho main comments
3. **Kiểm tra auto-collapse** cho nested replies
4. **Test toggle functionality** - click để mở/đóng
5. **Test với reply mới** - auto-expand khi có reply mới
6. **Test deep nesting** - hoạt động với nhiều levels

### Expected Results

- ✅ Main comments auto-expand
- ✅ Nested replies auto-collapse
- ✅ Toggle button hoạt động đúng
- ✅ Icon thay đổi theo trạng thái
- ✅ Số lượng replies hiển thị đúng
- ✅ Auto-expand khi có reply mới

## Comparison with Facebook

### Similarities

- ✅ Expand/collapse functionality
- ✅ Reply count display
- ✅ Chevron icon indication
- ✅ Clean, minimal design

### Differences

- **No animation**: Không có smooth transition animation
- **Simpler styling**: Styling đơn giản hơn
- **Auto-expand logic**: Tự động mở main comments
- **Level-based behavior**: Khác nhau theo level

## Future Enhancements

### Possible Improvements

1. **Smooth animations**: Thêm transition animations
2. **Keyboard shortcuts**: Hỗ trợ keyboard navigation
3. **Bulk operations**: Expand/collapse all replies
4. **Remember state**: Nhớ trạng thái expand/collapse
5. **Lazy loading**: Load replies khi cần thiết

### Advanced Features

1. **Infinite scroll**: Load more replies khi scroll
2. **Search in replies**: Tìm kiếm trong replies
3. **Reply notifications**: Thông báo khi có reply mới
4. **Reply reactions**: Like/dislike replies
5. **Reply mentions**: @username trong replies

## Files Modified

- `app/components/CommentModal.tsx`

## Key Features Added

1. **Expand/collapse state management**
2. **View replies button with count**
3. **Auto-expand logic for main comments**
4. **Auto-collapse logic for nested replies**
5. **Performance optimization with conditional rendering**
6. **Clean, Facebook-like UI/UX**
