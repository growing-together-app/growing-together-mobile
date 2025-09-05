/**
 * Test script để kiểm tra reply display
 * 
 * Cách test:
 * 1. Mở app và đi đến trang có comment system
 * 2. Tạo một comment chính
 * 3. Tap "Trả lời" trên comment đó
 * 4. Nhập nội dung reply và tap gửi
 * 5. Kiểm tra xem reply có hiển thị không
 */

console.log('Reply Display Test Instructions:');
console.log('================================');
console.log('');
console.log('1. Test Reply Creation:');
console.log('   - Tạo comment chính');
console.log('   - Tap "Trả lời"');
console.log('   - Nhập reply và gửi');
console.log('   - Kiểm tra Alert "Thành công"');
console.log('');
console.log('2. Test Reply Display:');
console.log('   - Reply có hiển thị dưới comment gốc không?');
console.log('   - Nếu không hiển thị, tap "Hiển thị replies (1)"');
console.log('   - Kiểm tra console logs để debug');
console.log('');
console.log('3. Debug với nút Debug:');
console.log('   - Khi đang reply, tap nút "Debug"');
console.log('   - Kiểm tra console logs:');
console.log('     * "Current comments state: [...]"');
console.log('     * "Replying to: [commentId]"');
console.log('     * "Target comment: {...}"');
console.log('     * "Target comment replies: [...]"');
console.log('');
console.log('4. Kiểm tra State Updates:');
console.log('   - Comments state có được update không?');
console.log('   - Target comment có replies array không?');
console.log('   - showReplies state có được set đúng không?');
console.log('');
console.log('5. Visual Feedback:');
console.log('   - Alert "Thành công" có hiển thị không?');
console.log('   - Reply input có được clear không?');
console.log('   - Reply input có được đóng không?');
console.log('');
console.log('6. Force Display:');
console.log('   - Nếu reply không hiển thị tự động');
console.log('   - Tap "Hiển thị replies (X)" để force hiển thị');
console.log('   - Kiểm tra xem reply có xuất hiện không');
console.log('');
console.log('7. Console Logs để theo dõi:');
console.log('   - "Creating reply: {...}"');
console.log('   - "Reply created successfully: {...}"');
console.log('   - "Updated comment with reply: {...}"');
console.log('   - "Reply submitted successfully"');
console.log('   - "Current comments state: [...]" (từ debug button)');
console.log('');
console.log('8. Troubleshooting:');
console.log('   - Nếu reply không hiển thị:');
console.log('     * Kiểm tra console logs');
console.log('     * Tap nút "Debug" để xem state');
console.log('     * Tap "Hiển thị replies" để force hiển thị');
console.log('     * Kiểm tra network requests');
console.log('');
console.log('9. Expected Behavior:');
console.log('   - Reply được tạo thành công');
console.log('   - Alert "Thành công" hiển thị');
console.log('   - Reply hiển thị dưới comment gốc');
console.log('   - Reply có đúng nội dung và thông tin user');
console.log('   - Console logs chi tiết để debug');
console.log('');
console.log('Nếu vẫn có vấn đề:');
console.log('- Kiểm tra backend response');
console.log('- Kiểm tra database records');
console.log('- Kiểm tra network errors');
console.log('- Sử dụng debug button để xem state');
