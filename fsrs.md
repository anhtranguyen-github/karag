# FSRS và Mô hình 5 Trạng thái Flashcard

## 1. Giới thiệu FSRS

FSRS (Free Spaced Repetition Scheduler) là một thuật toán lập lịch ôn tập hiện đại, được thiết kế dựa trên mô hình hóa trí nhớ con người. Khác với các thuật toán SRS truyền thống như SM-2, FSRS **không dựa vào các trạng thái học tập để quyết định lịch ôn**, mà sử dụng các tham số toán học nhằm ước lượng xác suất ghi nhớ theo thời gian.

FSRS tập trung vào việc trả lời câu hỏi cốt lõi:

> *Khi nào khả năng quên của người học đạt đến một ngưỡng nhất định để cần ôn lại?*

---

## 2. Các biến cốt lõi trong FSRS

Mỗi thẻ (card) trong FSRS được mô hình hóa thông qua ba biến chính:

### 2.1 Difficulty (D)
- Biểu thị độ khó nội tại của thẻ
- Gần như ổn định theo thời gian
- Thẻ càng khó thì tốc độ tăng Stability càng chậm

### 2.2 Stability (S)
- Đại diện cho độ bền của trí nhớ
- Đơn vị: ngày
- Tăng khi ôn đúng, giảm khi ôn sai
- Là tham số quan trọng nhất trong FSRS

### 2.3 Retrievability (R)
- Xác suất nhớ được thẻ tại một thời điểm nhất định
- Được tính dựa trên thời gian kể từ lần ôn cuối:

```
R(t) = exp(-t / S)
```

---

## 3. Trạng thái trong FSRS: Phân biệt rõ vai trò

FSRS **không định nghĩa trạng thái học tập ở mức thuật toán**. Tuy nhiên, trong triển khai thực tế (ví dụ Anki), các trạng thái workflow vẫn được sử dụng để điều phối trải nghiệm học tập và giao diện người dùng.

Tài liệu này sử dụng **5 trạng thái workflow** sau:

```
New
Learning
Review
Relearning
Burned
```

Các trạng thái này **không ảnh hưởng trực tiếp đến công thức FSRS**, mà đóng vai trò điều phối luồng học và áp dụng các quy tắc bổ trợ.

---

## 4. Định nghĩa chi tiết 5 trạng thái

### 4.1 New

**Mô tả**
- Thẻ chưa từng được học
- Chưa có dữ liệu lịch sử ôn tập

**FSRS**
- Khởi tạo các tham số ban đầu:

```
D = D0
S = S0
```

**Vai trò**
- Chuẩn bị thẻ bước vào giai đoạn ghi nhớ

---

### 4.2 Learning

**Mô tả**
- Giai đoạn ghi nhớ ngắn hạn
- Người học đang làm quen với nội dung thẻ

**FSRS**
- Có thể chưa áp dụng FSRS đầy đủ
- S thường rất nhỏ (phút đến vài giờ hoặc < 1 ngày)

**Vai trò**
- Củng cố trí nhớ ban đầu (encoding phase)

---

### 4.3 Review

**Mô tả**
- Thẻ đã vượt qua giai đoạn học ban đầu
- Được ôn theo chu kỳ dài hạn

**FSRS**
- FSRS hoạt động đầy đủ
- Khoảng ôn tiếp theo được xác định bằng cách giải phương trình:

```
R(t) ≈ target_retention
```

**Vai trò**
- Duy trì trí nhớ dài hạn

---

### 4.4 Relearning

**Mô tả**
- Thẻ đang ở trạng thái Review nhưng người học trả lời sai

**FSRS**
- Stability (S) bị giảm
- Difficulty (D) được điều chỉnh tăng
- Không reset hoàn toàn như SM-2

**Vai trò**
- Khôi phục trí nhớ đã suy giảm

---

### 4.5 Burned

**Mô tả**
- Thẻ được coi là đã ghi nhớ vững chắc
- Không còn cần ôn tập định kỳ

**FSRS**
- Ngừng lập lịch ôn
- Giữ dữ liệu để phân tích hoặc thống kê

**Quy tắc đề xuất**
- `S > 365 ngày`
- `R(due) > 0.95`
- Không có lỗi (lapses) trong N lần ôn gần nhất

**Vai trò**
- Kết thúc vòng đời của thẻ

---

## 5. Mối quan hệ giữa FSRS và trạng thái

| Trạng thái | FSRS tham gia | Vai trò chính |
|----------|-------------|---------------|
| New | ❌ | Khởi tạo tham số |
| Learning | ⚠️ | Ghi nhớ ngắn hạn |
| Review | ✅ | Lập lịch chính |
| Relearning | ✅ | Điều chỉnh trí nhớ |
| Burned | ❌ | Ngừng scheduling |

---

## 6. Luồng chuyển trạng thái (FSM dạng văn bản)

```
New
 ↓
Learning
 ↓
Review
 ↘      ↙
  Relearning
 ↓
Burned
```

**Lưu ý:**
- FSRS chỉ được áp dụng đầy đủ trong Review và Relearning
- Learning có thể sử dụng quy tắc riêng ngoài FSRS

---

## 7. Kết luận

FSRS đại diện cho cách tiếp cận hiện đại trong hệ thống SRS, tách bạch rõ ràng giữa:

- **Mô hình trí nhớ (FSRS: D, S, R)**
- **Luồng học tập và giao diện (các trạng thái workflow)**

Việc kết hợp FSRS với 5 trạng thái New, Learning, Review, Relearning và Burned giúp hệ thống vừa đảm bảo tính khoa học trong lập lịch ôn tập, vừa thân thiện và trực quan đối với người học.

