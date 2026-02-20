# 🧧 Lì Xì May Mắn - Hướng Dẫn Deploy Vercel

## Bước 1: Tạo Database trên Supabase (FREE)

1. Vào [supabase.com](https://supabase.com) và đăng ký/đăng nhập
2. Click **New Project** 
3. Đặt tên project, chọn region gần Việt Nam (Singapore)
4. Đợi project khởi tạo xong

### Tạo Database Tables:
1. Vào **SQL Editor** (menu bên trái)
2. Copy toàn bộ nội dung file `supabase-setup.sql` 
3. Paste vào SQL Editor và click **Run**

### Tạo Storage Bucket cho ảnh:
1. Vào **Storage** (menu bên trái)
2. Click **New bucket**
3. Tên: `qr-images`
4. ✅ Tick **Public bucket**
5. Click **Create bucket**

### Lấy API Keys:
1. Vào **Settings** > **API**
2. Copy:
   - **Project URL** (dạng: `https://xxx.supabase.co`)
   - **anon public key** (key dài)

---

## Bước 2: Deploy lên Vercel

### Cách 1: Deploy từ Git (Khuyến nghị)

1. Push code lên GitHub/GitLab
2. Vào [vercel.com](https://vercel.com) và đăng nhập
3. Click **Add New** > **Project**
4. Import repo từ GitHub
5. Trong **Environment Variables**, thêm:
   ```
   SUPABASE_URL = https://xxx.supabase.co
   SUPABASE_ANON_KEY = your_anon_key_here
   ```
6. Click **Deploy**

### Cách 2: Deploy bằng CLI

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (trong folder project)
cd c:\lixi
vercel

# Thêm Environment Variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY

# Deploy lại
vercel --prod
```

---

## Bước 3: Test

1. Mở URL Vercel cung cấp (dạng: `https://lixi-xxx.vercel.app`)
2. Điền tên, upload ảnh QR
3. Quay thưởng!
4. Check Supabase Dashboard để xem data

---

## Cấu trúc Project

```
lixi/
├── api/
│   └── index.js          # Serverless API (Express)
├── img/                   # Ảnh trang trí
├── index.html            # Frontend
├── package.json
├── vercel.json           # Vercel config
├── supabase-setup.sql    # SQL script cho Supabase
└── .env.example          # Mẫu env variables
```

---

## Chạy Local

```bash
# Tạo file .env
cp .env.example .env
# Điền SUPABASE_URL và SUPABASE_ANON_KEY vào .env

# Cài dependencies
npm install

# Chạy server
npm start

# Mở http://localhost:3000
```

---

## Troubleshooting

### Lỗi "Failed to upload image"
- Check bucket `qr-images` đã tạo chưa
- Check bucket đã set Public chưa

### Lỗi "User insert error"
- Check đã chạy SQL script chưa
- Check RLS policies đã tạo chưa

### Lỗi 500 trên Vercel
- Check Environment Variables đã add đúng chưa
- Check Vercel Logs để xem chi tiết lỗi

---

## 🎉 Done!

Chúc bạn có một năm mới vui vẻ và may mắn! 🧧
