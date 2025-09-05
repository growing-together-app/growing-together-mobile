# Keyboard Avoidance Fix - Comment System

## Vấn đề

Khi bình luận, ô nhập text không hiển thị ngay trên đầu bàn phím ảo, khiến người dùng không thể thấy nội dung đang nhập.

## Giải pháp đã thực hiện

### 1. Thêm KeyboardAvoidingView vào CommentModal

- **File**: `app/components/CommentModal.tsx`
- **Thay đổi**:
  - Import `KeyboardAvoidingView` và `Platform` từ React Native
  - Wrap toàn bộ modal content với `KeyboardAvoidingView`
  - Cấu hình behavior khác nhau cho iOS và Android:
    - iOS: `behavior="padding"`
    - Android: `behavior="height"`
  - Thêm `keyboardVerticalOffset` phù hợp

### 2. Thêm KeyboardAvoidingView vào CommentSystem

- **File**: `app/components/CommentSystem.tsx`
- **Thay đổi**:
  - Import `KeyboardAvoidingView` và `Platform` từ React Native
  - Wrap toàn bộ component với `KeyboardAvoidingView`
  - Cấu hình tương tự như CommentModal

### 3. Tạo KeyboardAwareView component tùy chỉnh

- **File**: `app/components/ui/KeyboardAwareView.tsx`
- **Mục đích**: Tạo component wrapper tùy chỉnh để dễ dàng sử dụng và cấu hình
- **Tính năng**:
  - Hỗ trợ enable/disable keyboard avoidance
  - Cấu hình behavior linh hoạt
  - Tự động detect platform và áp dụng settings phù hợp

### 4. Cải thiện layout

- Thêm `contentContainerStyle` cho FlatList và ScrollView
- Thêm `paddingBottom` để đảm bảo content không bị che
- Cải thiện spacing và padding

## Cấu hình chi tiết

### iOS

```javascript
behavior="padding"
keyboardVerticalOffset={0}
```

### Android

```javascript
behavior="height"
keyboardVerticalOffset={20}
```

## Files đã thay đổi

1. `app/components/CommentModal.tsx`

   - Thêm KeyboardAvoidingView
   - Cải thiện layout
   - Thêm contentContainerStyle

2. `app/components/CommentSystem.tsx`

   - Thêm KeyboardAvoidingView
   - Cải thiện layout
   - Thêm contentContainerStyle

3. `app/components/ui/KeyboardAwareView.tsx` (mới)

   - Component wrapper tùy chỉnh

4. `app/components/ui/index.ts` (mới)

   - Export KeyboardAwareView

5. `test-keyboard-behavior.js` (mới)
   - Hướng dẫn test keyboard behavior

## Cách test

1. **Test CommentModal**:

   - Mở modal bình luận
   - Tap vào ô nhập text
   - Kiểm tra ô nhập hiển thị trên đầu bàn phím

2. **Test CommentSystem**:

   - Mở trang có comment system
   - Tap vào ô nhập comment
   - Kiểm tra ô nhập hiển thị trên đầu bàn phím

3. **Test trên các thiết bị**:
   - iPhone (iOS)
   - Android phone
   - iPad (nếu có)

## Kết quả mong đợi

- ✅ Ô nhập text hiển thị trên đầu bàn phím ảo
- ✅ Animation mượt mà khi bàn phím xuất hiện/biến mất
- ✅ Không có lỗi console
- ✅ Performance tốt
- ✅ Hoạt động ổn định trên cả iOS và Android

## Lưu ý

- KeyboardAvoidingView có thể gây conflict với một số component khác
- Nếu có vấn đề, có thể cần điều chỉnh `keyboardVerticalOffset`
- Test kỹ trên các thiết bị thật để đảm bảo hoạt động tốt
