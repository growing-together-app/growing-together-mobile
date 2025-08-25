# Keyboard Avoidance Fix for Memory Modals

## Tổng quan

Đã cải thiện tính năng tránh bàn phím cho các modal thêm và chỉnh sửa memory để người dùng có thể cuộn lên và thấy được nội dung khi bàn phím xuất hiện.

## Các thay đổi đã thực hiện

### 1. AddMemoryModal.tsx

- **Thêm imports**: `KeyboardAvoidingView`, `Platform`
- **Cập nhật cấu trúc Modal**:
  - Bọc toàn bộ nội dung trong `KeyboardAvoidingView`
  - Sử dụng `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- **Cải thiện ScrollView**:
  - Thêm `keyboardShouldPersistTaps="handled"`
  - Thêm `contentContainerStyle={styles.scrollContent}`
  - Tách padding từ `content` style sang `scrollContent`
- **Cải thiện TextInput**:
  - Thêm `returnKeyType="next"` cho title và content
  - Thêm `returnKeyType="done"` cho tags
- **Thêm styles mới**:
  - `scrollContent`: padding cho nội dung cuộn
  - `bottomPadding`: khoảng trống cuối để cuộn tốt hơn

### 2. EditMemoryModal.tsx

- **Thêm imports**: `KeyboardAvoidingView`, `Platform`
- **Cập nhật cấu trúc Modal**:
  - Bọc toàn bộ nội dung trong `KeyboardAvoidingView`
  - Sử dụng `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- **Cải thiện ScrollView**:
  - Thêm `keyboardShouldPersistTaps="handled"`
  - Thêm `contentContainerStyle={styles.scrollContent}`
  - Tách padding từ `content` style sang `scrollContent`
- **Cải thiện TextInput**:
  - Thêm `returnKeyType="next"` cho title và content
  - Thêm `returnKeyType="done"` cho tags
- **Cải thiện VisibilityToggle**:
  - Bọc trong `View` với `formGroup` style để spacing tốt hơn
- **Thêm styles mới**:
  - `scrollContent`: padding cho nội dung cuộn
  - `bottomPadding`: khoảng trống cuối để cuộn tốt hơn

## Lợi ích

1. **Tránh bàn phím che mất nội dung**: Modal sẽ tự động cuộn lên khi bàn phím xuất hiện
2. **UX tốt hơn**: Người dùng có thể thấy được tất cả các trường input
3. **Tương thích đa nền tảng**: Hoạt động tốt trên cả iOS và Android
4. **Navigation tốt hơn**: Các phím return key được cấu hình phù hợp để di chuyển giữa các trường

## Cách hoạt động

- `KeyboardAvoidingView` sẽ tự động điều chỉnh layout khi bàn phím xuất hiện
- `ScrollView` với `keyboardShouldPersistTaps="handled"` cho phép tương tác với các element trong khi bàn phím đang mở
- `contentContainerStyle` đảm bảo padding được áp dụng đúng cách cho nội dung cuộn
- `bottomPadding` tạo khoảng trống cuối để người dùng có thể cuộn đến cuối form một cách dễ dàng

## Kiểm tra

Để kiểm tra tính năng này:

1. Mở modal thêm memory
2. Tap vào các trường input
3. Khi bàn phím xuất hiện, modal sẽ tự động cuộn lên
4. Có thể cuộn xuống để thấy các trường khác
5. Sử dụng phím "Next" để di chuyển giữa các trường
