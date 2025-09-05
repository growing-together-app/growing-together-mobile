# Thống nhất Style cho các nút Add trong App

## Tổng quan

Đã tạo component `AddButton` thống nhất để thay thế tất cả các nút "add" trong app, giúp giao diện đồng nhất và dễ bảo trì hơn.

## Component AddButton được tạo

- **File**: `app/components/ui/AddButton.tsx`
- **Variants**: 4 loại style khác nhau
  - `primary`: Màu xanh đậm (#4f8cff), nền trắng, viền xanh
  - `secondary`: Màu xanh nhạt (#f0f8ff), nền trắng, viền xanh
  - `empty-state`: Màu xanh đậm (#4f8cff), nền xanh, chữ trắng
  - `modal`: Màu xanh đậm (#4f8cff), nền xanh, chữ trắng

## Các file đã được cập nhật

### 1. app/children/[id]/profile.tsx

- **Thay thế**: 3 nút "Add Memory"
- **Variant sử dụng**: `primary` và `empty-state`
- **Xóa**: Styles `addMemoryButton`, `addMemoryButtonText`, `emptyStateAddButton`, `emptyStateAddButtonText`

### 2. app/family/[id].tsx

- **Thay thế**: 2 nút "Add Child to Group"
- **Variant sử dụng**: `modal`
- **Xóa**: Styles `addChildButton`, `addChildButtonText`

### 3. app/components/qa/QAContent.tsx

- **Thay thế**: 1 nút "Ask Your Child"
- **Variant sử dụng**: `primary` (đã thay đổi từ `modal` để đồng nhất)
- **Xóa**: Styles `askButton`, `askButtonText`

### 4. app/components/qa/PromptItem.tsx

- **Thay thế**: 1 nút "Answer"
- **Variant sử dụng**: `secondary`
- **Xóa**: Styles `addButton`, `addButtonText`

### 5. app/components/child/HealthContent.tsx

- **Thay thế**: 2 nút "Add Record" (cho Growth và Health)
- **Variant sử dụng**: `primary`
- **Xóa**: Styles `addButton`, `addButtonText`

### 6. app/components/family/AddChildToGroupModal.tsx

- **Thay thế**: 1 nút "Add to Group"
- **Variant sử dụng**: `modal`
- **Xóa**: Styles `addButton`, `addButtonDisabled`, `addButtonText`

### 7. app/tabs/home.tsx

- **Thay thế**: 1 nút "+ Add Group"
- **Variant sử dụng**: `primary`

### 8. app/components/child/AddMemoryModal.tsx

- **Thay thế**: 1 nút "Add Photos/Videos"
- **Variant sử dụng**: `primary`
- **Xóa**: Styles `addAttachmentButton`, `addAttachmentText`

### 9. app/components/health/EditHealthRecordModal.tsx

- **Thay thế**: 1 nút "Add Photos/Videos"
- **Variant sử dụng**: `primary`
- **Xóa**: Styles `addAttachmentButton`, `addAttachmentText`

## Lợi ích đạt được

### 1. Tính nhất quán

- Tất cả nút add giờ có style đồng nhất
- Màu sắc, kích thước, font chữ được chuẩn hóa
- Icon và spacing được thống nhất

### 2. Dễ bảo trì

- Chỉ cần sửa 1 component để thay đổi style tất cả nút add
- Code ngắn gọn hơn, ít lặp lại
- Dễ dàng thêm variants mới

### 3. UX tốt hơn

- Người dùng nhận diện nút add dễ dàng hơn
- Giao diện chuyên nghiệp và hiện đại hơn
- Responsive và accessible tốt hơn

## Cách sử dụng AddButton

```tsx
import AddButton from '../components/ui/AddButton';

// Primary variant (mặc định)
<AddButton
  title="Add Memory"
  onPress={() => setShowModal(true)}
  variant="primary"
  iconSize={24}
/>

// Empty state variant
<AddButton
  title="Add Your First Memory"
  onPress={() => setShowModal(true)}
  variant="empty-state"
  iconSize={20}
/>

// Modal variant
<AddButton
  title="Add Child to Group"
  onPress={() => setShowModal(true)}
  variant="modal"
  iconSize={24}
/>

// Secondary variant
<AddButton
  title="Answer"
  onPress={() => setShowModal(true)}
  variant="secondary"
  iconSize={20}
/>
```

## Props của AddButton

- `title`: Text hiển thị trên nút
- `onPress`: Function được gọi khi nhấn nút
- `variant`: Loại style ('primary' | 'secondary' | 'empty-state' | 'modal')
- `iconSize`: Kích thước icon (mặc định: 20)
- `disabled`: Trạng thái disabled (mặc định: false)
- `style`: Style tùy chỉnh cho button
- `textStyle`: Style tùy chỉnh cho text
- `iconName`: Tên icon (mặc định: 'add')

## Lưu ý

- Component đã được tối ưu cho TypeScript
- Hỗ trợ đầy đủ các trạng thái disabled
- Có thể tùy chỉnh style thông qua props
- Tương thích với tất cả các màn hình trong app
