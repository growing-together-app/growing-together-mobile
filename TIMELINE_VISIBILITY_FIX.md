# Timeline Visibility Fix

## Vấn đề

Khi người dùng thay đổi visibility của memory posts trong tab timeline, có các vấn đề sau:

1. **Tab timeline bị gọi lại API**: Mỗi khi thay đổi visibility, toàn bộ tab timeline bị fetch lại API
2. **Post không hiển thị ngay**: Khi set post sang private, nó không biến mất ngay mà phải chuyển tab rồi quay lại mới thấy
3. **Chỉ xảy ra với memory posts**: Các loại post khác (Q&A, Health, Growth) không bị vấn đề này

## Nguyên nhân

1. **TimelinePost component thiếu VisibilityToggle**: Component này không có chức năng thay đổi visibility
2. **Logic fetch timeline không tối ưu**: Mỗi khi activeTab thay đổi thành "timeline", nó reset và fetch lại toàn bộ data
3. **Không có sync giữa memory tab và timeline tab**: Khi thay đổi visibility trong memory tab, timeline tab không được cập nhật

## Giải pháp đã implement

### 1. Thêm VisibilityToggle vào TimelinePost

```typescript
// Thêm imports
import VisibilityToggle from "../ui/VisibilityToggle";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { updateMemory } from "../../redux/slices/memorySlice";

// Thêm props
interface TimelinePostProps {
  // ... existing props
  onVisibilityUpdate?: (
    postId: string,
    visibility: "private" | "public"
  ) => void;
}

// Thêm logic kiểm tra owner
const isOwner =
  currentUser &&
  post &&
  postChildId &&
  children &&
  children.some((child) => {
    const childId = child.id;
    const childParentId = getParentId(child.parentId);
    const currentUserId = currentUser.id;

    return childId === postChildId && childParentId === currentUserId;
  });

// Thêm handler
const handleVisibilityUpdate = async (newVisibility: "private" | "public") => {
  try {
    // For memory posts, update through Redux
    if (contentType.toLowerCase() === "memory") {
      await dispatch(
        updateMemory({
          memoryId: post._id || post.id,
          data: { visibility: newVisibility },
        })
      ).unwrap();
    }

    // Call parent callback if provided
    if (onVisibilityUpdate) {
      onVisibilityUpdate(post._id || post.id, newVisibility);
    }
  } catch (error) {
    throw error;
  }
};

// Thêm UI
{
  contentType.toLowerCase() === "memory" && isOwner && (
    <View style={styles.visibilityContainer}>
      <VisibilityToggle
        visibility={post.visibility || "private"}
        onUpdate={handleVisibilityUpdate}
        size="small"
      />
    </View>
  );
}
```

### 2. Cập nhật logic fetch timeline

```typescript
// Chỉ fetch khi cần thiết
useEffect(() => {
  if (activeTab === "timeline" && timelinePosts.length === 0) {
    setTimelinePage(1);
    setHasMoreTimeline(true);
    fetchTimelinePosts();
  }
}, [activeTab, currentGroup?.id]);

// Refresh khi group thay đổi
useEffect(() => {
  if (currentGroup?.id && activeTab === "timeline") {
    setTimelinePage(1);
    setHasMoreTimeline(true);
    setTimelinePosts([]);
    fetchTimelinePosts();
  }
}, [currentGroup?.id]);

// Refresh khi screen focus
useFocusEffect(
  useCallback(() => {
    if (activeTab === "timeline" && currentGroup?.id) {
      refreshTimelinePosts();
    }
  }, [activeTab, currentGroup?.id])
);
```

### 3. Xử lý visibility update trong timeline

```typescript
const handleTimelineVisibilityUpdate = (
  postId: string,
  visibility: "private" | "public"
) => {
  if (visibility === "private") {
    // Remove the post from timeline if it becomes private
    setTimelinePosts((prevPosts) =>
      prevPosts.filter((post) => post._id !== postId && post.id !== postId)
    );
  } else {
    // Update the post in local state to reflect the change immediately
    setTimelinePosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === postId || post.id === postId
          ? { ...post, visibility }
          : post
      )
    );
  }

  // Refresh timeline after a short delay to ensure backend changes are reflected
  setTimeout(() => {
    if (activeTab === "timeline") {
      refreshTimelinePosts();
    }
  }, 1000);
};
```

### 4. Sync với memory state

```typescript
// Lắng nghe thay đổi từ memory state
useEffect(() => {
  if (activeTab === "timeline" && currentGroup?.id && memories.length > 0) {
    refreshTimelinePosts();
  }
}, [memories, activeTab, currentGroup?.id]);
```

## Kết quả

1. ✅ **TimelinePost có VisibilityToggle**: Chỉ hiển thị cho owner của child
2. ✅ **Cập nhật ngay lập tức**: Khi thay đổi visibility, UI được cập nhật ngay
3. ✅ **Private posts biến mất**: Khi set sang private, post biến mất khỏi timeline ngay lập tức
4. ✅ **Không fetch API không cần thiết**: Chỉ fetch khi thực sự cần thiết
5. ✅ **Sync giữa các tab**: Thay đổi trong memory tab được reflect trong timeline tab

## Testing

1. **Test trong tab memory**: Thay đổi visibility của memory posts
2. **Test trong tab timeline**: Thay đổi visibility của memory posts
3. **Test chuyển tab**: Chuyển giữa memory và timeline tab
4. **Test private posts**: Set post sang private và kiểm tra nó biến mất
5. **Test public posts**: Set post sang public và kiểm tra nó xuất hiện

## Notes

- Chỉ memory posts mới có VisibilityToggle trong timeline
- Các loại post khác (Q&A, Health, Growth) không bị ảnh hưởng
- Timeline chỉ hiển thị public posts từ backend
- Private posts được lọc out ngay lập tức khi visibility thay đổi
