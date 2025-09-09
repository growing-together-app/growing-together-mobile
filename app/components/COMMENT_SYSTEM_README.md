# CommentSystem Thống Nhất

## Tổng quan

CommentSystem đã được refactor để hoạt động thống nhất trong cả hai trường hợp:

1. **Inline mode**: Hiển thị comment trực tiếp trong component (như trong TimelineItem)
2. **Modal mode**: Hiển thị comment trong Modal toàn màn hình

## Cách sử dụng

### 1. Inline Mode (Comment trong component)

```tsx
import CommentSystem from "../CommentSystem";

<CommentSystem
  targetType="memory"
  targetId="post-id"
  mode="inline"
  maxHeight={500} // Tùy chỉnh chiều cao
  useScrollView={true}
  onCommentAdded={(comment) => {
    // Xử lý khi có comment mới
  }}
  onCommentDeleted={(commentId) => {
    // Xử lý khi xóa comment
  }}
  onCommentEdited={(comment) => {
    // Xử lý khi sửa comment
  }}
/>;
```

### 2. Modal Mode (Comment trong Modal)

```tsx
import { CommentModal } from "../CommentSystem";

<CommentModal
  visible={showCommentModal}
  onClose={() => setShowCommentModal(false)}
  targetType="memory"
  targetId="post-id"
  onCommentAdded={(comment) => {
    // Xử lý khi có comment mới
  }}
  onCommentDeleted={(commentId) => {
    // Xử lý khi xóa comment
  }}
  onCommentEdited={(comment) => {
    // Xử lý khi sửa comment
  }}
/>;
```

## Props

### CommentSystem Props

| Prop               | Type                | Default  | Mô tả                                                            |
| ------------------ | ------------------- | -------- | ---------------------------------------------------------------- |
| `targetType`       | string              | -        | Loại target (memory, promptResponse, healthRecord, growthRecord) |
| `targetId`         | string              | -        | ID của target                                                    |
| `mode`             | 'modal' \| 'inline' | 'inline' | Chế độ hiển thị                                                  |
| `maxHeight`        | number              | 400      | Chiều cao tối đa cho inline mode                                 |
| `showHeader`       | boolean             | false    | Hiển thị header (chỉ cho modal mode)                             |
| `onClose`          | function            | -        | Callback đóng modal                                              |
| `useScrollView`    | boolean             | false    | Sử dụng ScrollView thay vì FlatList                              |
| `onCommentAdded`   | function            | -        | Callback khi thêm comment                                        |
| `onCommentDeleted` | function            | -        | Callback khi xóa comment                                         |
| `onCommentEdited`  | function            | -        | Callback khi sửa comment                                         |

### CommentModal Props

| Prop               | Type     | Default | Mô tả                     |
| ------------------ | -------- | ------- | ------------------------- |
| `visible`          | boolean  | -       | Hiển thị modal            |
| `onClose`          | function | -       | Callback đóng modal       |
| `targetType`       | string   | -       | Loại target               |
| `targetId`         | string   | -       | ID của target             |
| `onCommentAdded`   | function | -       | Callback khi thêm comment |
| `onCommentDeleted` | function | -       | Callback khi xóa comment  |
| `onCommentEdited`  | function | -       | Callback khi sửa comment  |

## Xử lý bàn phím

### Inline Mode

- Sử dụng `keyboardVerticalOffset` âm để tránh bị che bàn phím
- iOS: -100, Android: -80
- `maxHeight` có thể tùy chỉnh để tăng không gian

### Modal Mode

- Sử dụng `keyboardVerticalOffset` chuẩn
- iOS: 0, Android: 20
- Tự động điều chỉnh layout trong Modal

## Lợi ích

1. **Thống nhất**: Một component cho cả hai trường hợp
2. **Dễ bảo trì**: Không cần duplicate code
3. **Linh hoạt**: Có thể tùy chỉnh behavior cho từng mode
4. **Xử lý bàn phím tốt**: Không bị che input trong cả hai trường hợp
5. **Performance**: Sử dụng chung logic và state management

## Migration từ CommentModal cũ

Thay vì:

```tsx
import CommentModal from "../CommentModal";
```

Sử dụng:

```tsx
import { CommentModal } from "../CommentSystem";
```

API hoàn toàn tương thích, không cần thay đổi props.
