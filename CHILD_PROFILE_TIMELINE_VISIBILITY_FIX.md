# Child Profile Timeline Visibility Fix

## Vấn đề

Trong child profile, khi user thay đổi visibility của memory posts trong tab timeline, có các vấn đề:

1. **Tab timeline bị gọi lại API**: Mỗi khi thay đổi visibility, toàn bộ tab timeline bị fetch lại API
2. **Post không hiển thị ngay**: Khi set post sang private, nó không biến mất ngay mà phải chuyển tab rồi quay lại mới thấy
3. **Chỉ xảy ra với memory posts**: Q&A posts hoạt động mượt mà

## Nguyên nhân

1. **Function `handleVisibilityUpdate` đã tồn tại** trong child profile và hoạt động đúng
2. **TimelineItem component đã có VisibilityToggle** và logic hiển thị đúng
3. **Vấn đề có thể là ở logic `isOwner` hoặc `viewerIsOwner`**

## Debug Steps

### 1. Kiểm tra viewerIsOwner

```typescript
// Debug viewerIsOwner
console.log("🔍 viewerIsOwner debug:", {
  currentUserId: currentUser?.id,
  childParentId: currentChild?.parentId,
  viewerIsOwner,
  currentChild: currentChild
    ? { id: currentChild.id, parentId: currentChild.parentId }
    : null,
});
```

### 2. Kiểm tra TimelineItem visibility

```typescript
// Debug visibility toggle
console.log("🔍 TimelineItem visibility debug:", {
  itemId: item.id,
  itemType: item.type,
  isOwner,
  hasOnVisibilityUpdate: !!onVisibilityUpdate,
  visibility: item.visibility,
});
```

### 3. Kiểm tra handleVisibilityUpdate

Function `handleVisibilityUpdate` trong child profile đã tồn tại và xử lý đúng:

```typescript
const handleVisibilityUpdate = async (
  itemId: string,
  visibility: "private" | "public"
) => {
  try {
    // Find the item type and update accordingly
    const memory = memories.find((m) => m.id === itemId);
    if (memory) {
      await dispatch(
        updateMemory({ memoryId: itemId, data: { visibility } })
      ).unwrap();
      return;
    }

    const response = responses.find((r) => r.id === itemId);
    if (response) {
      await dispatch(
        updateResponse({ responseId: itemId, data: { visibility } })
      ).unwrap();
      return;
    }

    const healthRecord = healthRecords.find((h) => h.id === itemId);
    if (healthRecord) {
      await dispatch(
        updateHealthRecord({ recordId: itemId, data: { visibility } })
      ).unwrap();
      return;
    }

    const growthRecord = growthRecords.find((g) => g.id === itemId);
    if (growthRecord) {
      await dispatch(
        updateGrowthRecord({ recordId: itemId, data: { visibility } })
      ).unwrap();
      return;
    }

    // Item not found
  } catch (error) {
    throw error;
  }
};
```

## Các khả năng

### Khả năng 1: Logic isOwner không đúng

- `viewerIsOwner` có thể không đúng
- Logic kiểm tra owner trong TimelineItem có thể không đúng

### Khả năng 2: Callback không được truyền đúng

- `onVisibilityUpdate` có thể không được truyền đúng từ child profile
- Callback có thể bị undefined

### Khả năng 3: CSS/Layout issue

- VisibilityToggle có thể bị ẩn do CSS
- Layout có thể bị overflow

## Expected Fix

Sau khi debug, cần:

1. **Sửa logic `viewerIsOwner`** nếu cần
2. **Sửa logic `isOwner`** trong TimelineItem nếu cần
3. **Đảm bảo `onVisibilityUpdate` được truyền đúng**
4. **Kiểm tra CSS/Layout** nếu cần

## Testing

1. **Test trong child profile timeline tab**: Xem debug logs
2. **So sánh với Q&A**: Xem sự khác biệt
3. **Test viewerIsOwner**: Xem có đúng không
4. **Test TimelineItem**: Xem VisibilityToggle có hiển thị không

## Notes

- Q&A posts hoạt động mượt mà vì có logic riêng trong QuestionAnswerCard
- Memory posts sử dụng TimelineItem chung với logic khác
- Cần đảm bảo logic owner check đúng cho tất cả loại content
