# Memory Timeline Visibility Debug

## Vấn đề hiện tại

- Q&A posts hoạt động mượt mà trong timeline
- Memory posts không có VisibilityToggle hiển thị trong timeline
- Memory posts trong tab memory hoạt động bình thường

## Debug Steps

### 1. Kiểm tra cấu trúc dữ liệu

Cần kiểm tra xem memory posts trong timeline có cấu trúc dữ liệu như thế nào:

```typescript
// Debug logging đã thêm vào TimelinePost
console.log("📝 TimelinePost rendering:", {
  postId: post?._id || post?.id,
  contentType: post?.contentType || "unknown",
  childName: post?.child?.nickname || post?.child?.firstName,
  visibility: post?.visibility || "unknown",
  hasChild: !!post?.child,
  hasContent: !!post?.content || !!post?.text || !!post?.title,
  // Debug memory post structure
  postKeys: post ? Object.keys(post) : [],
  childKeys: post?.child ? Object.keys(post.child) : [],
  childId: post?.childId,
  parentId: post?.parentId,
});
```

### 2. Kiểm tra logic isOwner

```typescript
// Debug isOwner calculation
console.log("🔍 Memory post isOwner debug:", {
  postId: post?._id || post?.id,
  currentUser: currentUser?.id,
  postChildId,
  childrenCount: children?.length || 0,
  isOwner,
  children: children?.map((child) => ({
    childId: child.id,
    childParentId: getParentId(child.parentId),
    currentUserId: currentUser?.id,
    matches:
      child.id === postChildId &&
      getParentId(child.parentId) === currentUser?.id,
  })),
});
```

### 3. So sánh với Q&A

Q&A posts hoạt động mượt mà vì:

- Có VisibilityToggle trong QuestionAnswerCard
- Sử dụng updateResponse action
- Logic isOwner đúng

Memory posts không hoạt động vì:

- Có thể cấu trúc dữ liệu khác
- Có thể logic isOwner không đúng
- Có thể childId/parentId được lưu ở vị trí khác

## Các khả năng

### Khả năng 1: Cấu trúc dữ liệu khác

Memory posts trong timeline có thể có cấu trúc:

```typescript
{
  _id: "memory_id",
  contentType: "memory",
  child: {
    _id: "child_id",  // childId ở đây
    nickname: "Child Name"
  },
  parentId: "parent_id",  // parentId ở đây
  visibility: "public"
}
```

### Khả năng 2: Logic isOwner không đúng

Có thể cần kiểm tra:

- `post.child._id` thay vì `post.childId`
- `post.parentId` thay vì `post.authorId`

### Khả năng 3: Children data không đúng

Có thể `children` từ Redux state không đúng hoặc không có data.

## Test Cases

1. **Test trong tab timeline**: Xem debug logs cho memory posts
2. **So sánh với Q&A**: Xem cấu trúc dữ liệu khác nhau
3. **Test isOwner logic**: Xem có tính đúng không
4. **Test VisibilityToggle**: Xem có hiển thị không

## Expected Fix

Sau khi debug, cần:

1. Sửa logic lấy `postChildId` nếu cần
2. Sửa logic `isOwner` nếu cần
3. Đảm bảo VisibilityToggle hiển thị cho memory posts
4. Test visibility update hoạt động
