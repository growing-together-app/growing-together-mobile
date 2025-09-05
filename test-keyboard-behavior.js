/**
 * Test script để kiểm tra keyboard behavior trong comment system
 * 
 * Cách test:
 * 1. Mở app trên thiết bị thật hoặc simulator
 * 2. Đi đến một trang có comment system
 * 3. Tap vào ô nhập comment
 * 4. Kiểm tra xem ô nhập có hiển thị trên đầu bàn phím không
 * 5. Test trên cả iOS và Android
 */

console.log('Keyboard Behavior Test Instructions:');
console.log('=====================================');
console.log('');
console.log('1. Test CommentModal:');
console.log('   - Mở modal bình luận');
console.log('   - Tap vào ô nhập text chính');
console.log('   - Kiểm tra: ô nhập phải hiển thị trên đầu bàn phím');
console.log('   - Test reply input cũng tương tự');
console.log('');
console.log('2. Test CommentSystem:');
console.log('   - Mở trang có comment system');
console.log('   - Tap vào ô nhập comment');
console.log('   - Kiểm tra: ô nhập phải hiển thị trên đầu bàn phím');
console.log('');
console.log('3. Test trên các thiết bị:');
console.log('   - iPhone (iOS)');
console.log('   - Android phone');
console.log('   - iPad (nếu có)');
console.log('');
console.log('4. Các trường hợp cần test:');
console.log('   - Nhập comment mới');
console.log('   - Reply comment');
console.log('   - Edit comment');
console.log('   - Modal full screen');
console.log('   - Modal trong scroll view');
console.log('');
console.log('5. Kiểm tra:');
console.log('   - Ô nhập không bị che bởi bàn phím');
console.log('   - Animation mượt mà');
console.log('   - Không có lỗi console');
console.log('   - Performance tốt');
console.log('');
console.log('Nếu có vấn đề, kiểm tra:');
console.log('- KeyboardAvoidingView behavior');
console.log('- keyboardVerticalOffset');
console.log('- Platform differences');
console.log('- Modal presentation style');
