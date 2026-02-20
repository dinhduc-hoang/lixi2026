require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from root directory
app.use(express.static(path.join(__dirname, '..')));
app.use('/img', express.static(path.join(__dirname, '..', 'img')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate transaction ID
function generateTransactionId() {
    return 'LX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// ==================== API ROUTES ====================

// Register user with QR image (base64)
app.post('/api/register', async (req, res) => {
    try {
        const { name, qrImageBase64, qrImageType } = req.body;

        if (!name || !qrImageBase64) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền tên và upload ảnh QR!'
            });
        }

        if (supabaseUrl === 'https://placeholder.supabase.co') {
            return res.status(500).json({
                success: false,
                message: 'Chưa cấu hình Supabase trên Vercel! Vui lòng vào Settings > Environment Variables để thêm SUPABASE_URL và SUPABASE_ANON_KEY'
            });
        }

        // Upload image to Supabase Storage
        const fileName = `qr-${Date.now()}-${Math.random().toString(36).substring(7)}.${qrImageType || 'jpg'}`;

        // Convert base64 to buffer
        const base64Data = qrImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('qr-images')
            .upload(fileName, buffer, {
                contentType: `image/${qrImageType || 'jpeg'}`,
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({ success: false, message: 'Lỗi upload ảnh: ' + uploadError.message });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('qr-images')
            .getPublicUrl(fileName);

        const qrImageUrl = urlData.publicUrl;

        // Insert user to database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ name, qr_image: qrImageUrl }])
            .select()
            .single();

        if (userError) {
            console.error('User insert error:', userError);
            return res.status(500).json({ success: false, message: 'Lỗi lưu user: ' + userError.message });
        }

        res.json({
            success: true,
            user: {
                id: userData.id,
                name: userData.name,
                qrImage: qrImageUrl
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

// Save spin result
app.post('/api/spin', async (req, res) => {
    try {
        const { userId, prizeName, prizeValue, prizeEmoji } = req.body;

        if (!userId || !prizeName || prizeValue === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin!'
            });
        }

        if (supabaseUrl === 'https://placeholder.supabase.co') {
            return res.status(500).json({
                success: false,
                message: 'Chưa cấu hình Supabase trên Vercel!'
            });
        }

        const transactionId = generateTransactionId();

        const { data, error } = await supabase
            .from('spin_results')
            .insert([{
                user_id: userId,
                transaction_id: transactionId,
                prize_name: prizeName,
                prize_value: prizeValue,
                prize_emoji: prizeEmoji || '🧧'
            }])
            .select()
            .single();

        if (error) {
            console.error('Spin insert error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi lưu kết quả!' });
        }

        res.json({
            success: true,
            result: {
                transactionId,
                prizeName,
                prizeValue,
                prizeEmoji
            }
        });
    } catch (error) {
        console.error('Spin error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Get all spin history
app.get('/api/history', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('spin_results')
            .select(`
                *,
                users (name, qr_image)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('History error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử!' });
        }

        // Transform data
        const results = data.map(item => ({
            ...item,
            user_name: item.users?.name,
            qr_image: item.users?.qr_image
        }));

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const { data: users } = await supabase.from('users').select('id', { count: 'exact' });
        const { data: spins, count: spinCount } = await supabase.from('spin_results').select('prize_value', { count: 'exact' });

        const totalPrizeValue = spins?.reduce((sum, s) => sum + s.prize_value, 0) || 0;

        res.json({
            success: true,
            stats: {
                totalUsers: users?.length || 0,
                totalSpins: spinCount || 0,
                totalPrizeValue
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for Vercel
module.exports = app;

// For local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`
    🧧 ====================================== 🧧
    |                                          |
    |    LÌ XÌ SERVER ĐANG CHẠY!              |
    |                                          |
    |    👉 http://localhost:${PORT}             |
    |                                          |
    🧧 ====================================== 🧧
        `);
    });
}
