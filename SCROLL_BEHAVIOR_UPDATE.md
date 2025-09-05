# Cập nhật Scroll Behavior - Chỉ cố định Header

## Tổng quan

Đã cập nhật cấu trúc scroll behavior trong app để chỉ cố định AppHeader khi người dùng cuộn, còn lại tất cả nội dung khác đều cuộn được. Đồng thời đã thêm FooterBar để đồng nhất với các trang khác trong app.

## Thay đổi chính

### 1. app/children/[id]/profile.tsx

**Trước:**

```tsx
<View style={styles.container}>
  <AppHeader />
  <View style={styles.childHeader}>...</View>
  <View style={styles.tabContainer}>...</View>
  <ScrollView>
    <View style={styles.tabContent}>{renderTabContent()}</View>
  </ScrollView>
</View>
```

**Sau:**

```tsx
<ScreenWithFooter>
  {/* Fixed App Header */}
  <AppHeader />
  {/* Scrollable Content - Everything else scrolls */}
  <ScrollView>
    <View style={styles.childHeader}>...</View>
    <View style={styles.tabContainer}>...</View>
    <View style={styles.tabContent}>{renderTabContent()}</View>
  </ScrollView>
  {/* Modals and Search Results */}
  ...
</ScreenWithFooter>
```

## Lợi ích đạt được

### 1. UX tốt hơn

- Header luôn hiển thị để người dùng có thể search và navigate
- Tất cả nội dung khác cuộn mượt mà
- Không bị gián đoạn khi cuộn

### 2. Tính nhất quán

- Cấu trúc tương tự như các màn hình khác (home.tsx, family/[id].tsx)
- Behavior đồng nhất trên toàn app

### 3. Hiệu suất tốt hơn

- Chỉ cần render lại nội dung trong ScrollView
- Header không bị re-render khi cuộn

## Cấu trúc hiện tại

### Màn hình đã được cập nhật:

1. **app/children/[id]/profile.tsx** ✅
2. **app/tabs/home.tsx** ✅ (đã có cấu trúc đúng)
3. **app/family/[id].tsx** ✅ (đã có cấu trúc đúng)

### Cấu trúc chuẩn:

```tsx
<ScreenWithFooter>
  {/* Fixed App Header */}
  <AppHeader />
  {/* Scrollable Content */}
  <ScrollView style={styles.scrollableContent}>
    {/* Tất cả nội dung khác */}
  </ScrollView>
  {/* Modals and Search Results */}
  ...
</ScreenWithFooter>
```

## Styles quan trọng

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollableContent: {
    flex: 1, // Chiếm toàn bộ không gian còn lại
  },
  scrollableContentContainer: {
    flexGrow: 1, // Cho phép content mở rộng
  },
});
```

## Lưu ý

- AppHeader luôn cố định ở đầu màn hình
- Tất cả nội dung khác (child info, tabs, content) đều cuộn được
- FooterBar được hiển thị ở cuối màn hình (giống các trang khác)
- RefreshControl vẫn hoạt động bình thường
- Search functionality vẫn hoạt động tốt
