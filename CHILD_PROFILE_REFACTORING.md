# Child Profile Refactoring

## 📁 Cấu trúc file đã tách

### 🪝 Custom Hooks

#### `app/hooks/useChildProfile.ts`

- **Chức năng**: Logic chính của child profile
- **Chứa**: State management, API calls, event handlers
- **Exports**: Tất cả state và actions cần thiết

#### `app/hooks/useTimelineItems.ts`

- **Chức năng**: Xử lý timeline items
- **Chứa**: Logic tạo và filter timeline items
- **Exports**: `timelineItems`, `filteredTimelineItems`

#### `app/hooks/useVisibilityUpdate.ts`

- **Chức năng**: Update visibility của posts
- **Chứa**: Logic update visibility cho memory, response, health, growth
- **Exports**: `handleVisibilityUpdate`

### 🧩 Components

#### `app/components/child/ChildProfileHeader.tsx`

- **Chức năng**: Header component hiển thị thông tin child
- **Chứa**: Avatar, name, age, profile details, edit/delete buttons
- **Props**: `currentChild`, `onEdit`, `onDelete`

### 📄 File chính mới

#### `app/children/[id]/profile-refactored.tsx`

- **Chức năng**: File chính sử dụng các hooks và components đã tách
- **Kích thước**: ~200 dòng (giảm từ 2600+ dòng)
- **Dễ bảo trì**: Logic được tách riêng, dễ test và debug

## 🚀 Cách sử dụng

### 1. Import hooks

```typescript
import {
  useChildProfile,
  useTimelineItems,
  useVisibilityUpdate,
} from "../../hooks";
```

### 2. Import components

```typescript
import { ChildProfileHeader } from "../../components/child";
```

### 3. Sử dụng trong component

```typescript
export default function ChildProfileScreen() {
  const {
    id,
    currentChild,
    loading,
    error,
    // ... other state
    handleChildEdit,
    handleChildDelete,
  } = useChildProfile();

  const { timelineItems, filteredTimelineItems } = useTimelineItems(
    id,
    memories,
    responses,
    healthRecords,
    growthRecords,
    prompts,
    currentUser
  );

  const { handleVisibilityUpdate } = useVisibilityUpdate(
    memories,
    responses,
    healthRecords,
    growthRecords,
    forceUpdate
  );

  return (
    <View>
      <ChildProfileHeader
        currentChild={currentChild}
        onEdit={handleChildEdit}
        onDelete={handleChildDelete}
      />
      {/* Rest of the component */}
    </View>
  );
}
```

## ✅ Lợi ích

1. **Dễ bảo trì**: Mỗi file có một chức năng cụ thể
2. **Dễ test**: Có thể test từng hook/component riêng biệt
3. **Tái sử dụng**: Hooks có thể được sử dụng ở nhiều nơi
4. **Performance**: Logic được tối ưu và memoized
5. **Code splitting**: Giảm kích thước bundle

## 🔄 Migration

### Từ file cũ sang file mới:

1. **Backup file cũ**: `profile.tsx` → `profile-backup.tsx`
2. **Rename file mới**: `profile-refactored.tsx` → `profile.tsx`
3. **Test functionality**: Đảm bảo tất cả features hoạt động
4. **Remove backup**: Xóa file backup sau khi confirm

### Rollback nếu cần:

```bash
git checkout HEAD -- app/children/[id]/profile.tsx
```

## 🧪 Testing

### Test hooks:

```typescript
import { renderHook } from "@testing-library/react-hooks";
import { useChildProfile } from "../../hooks/useChildProfile";

test("useChildProfile should return correct state", () => {
  const { result } = renderHook(() => useChildProfile());
  expect(result.current.id).toBeDefined();
});
```

### Test components:

```typescript
import { render } from "@testing-library/react-native";
import { ChildProfileHeader } from "../../components/child/ChildProfileHeader";

test("ChildProfileHeader should render child info", () => {
  const { getByText } = render(
    <ChildProfileHeader
      currentChild={mockChild}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />
  );
  expect(getByText("John Doe")).toBeTruthy();
});
```

## 📝 Notes

- Tất cả logic cũ vẫn được giữ nguyên
- Performance được cải thiện nhờ memoization
- Code dễ đọc và maintain hơn
- Có thể mở rộng dễ dàng trong tương lai
