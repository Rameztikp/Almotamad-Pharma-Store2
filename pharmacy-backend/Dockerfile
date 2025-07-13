# استخدام Go image الرسمي
FROM golang:1.21-alpine AS builder

# تثبيت git (مطلوب لبعض المكتبات)
RUN apk add --no-cache git

# تعيين مجلد العمل
WORKDIR /app

# نسخ ملفات Go modules
COPY go.mod go.sum ./

# تحميل المكتبات
RUN go mod download

# نسخ الكود المصدري
COPY . .

# بناء التطبيق
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# استخدام Alpine image للإنتاج
FROM alpine:latest

# تثبيت ca-certificates للاتصالات الآمنة
RUN apk --no-cache add ca-certificates

# إنشاء مستخدم غير root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /root/

# نسخ التطبيق المبني من المرحلة السابقة
COPY --from=builder /app/main .

# تغيير ملكية الملفات
RUN chown -R appuser:appgroup /root/

# التبديل للمستخدم غير root
USER appuser

# كشف المنفذ
EXPOSE 8080

# تشغيل التطبيق
CMD ["./main"]

