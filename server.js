const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Database instance
let db = null;
const DB_PATH = path.join(__dirname, 'lixi.db');

// Initialize SQL.js and load/create database
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Try to load existing database
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('📂 Đã load database từ file');
    } else {
        db = new SQL.Database();
        console.log('✨ Tạo database mới');
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            qr_image TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS spin_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            transaction_id TEXT NOT NULL UNIQUE,
            prize_name TEXT NOT NULL,
            prize_value INTEGER NOT NULL,
            prize_emoji TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    saveDatabase();
}

// Save database to file
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Create uploads/qr folder if not exists
const qrFolder = path.join(__dirname, 'uploads', 'qr');
if (!fs.existsSync(qrFolder)) {
    fs.mkdirSync(qrFolder, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, qrFolder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'qr-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)!'));
    }
});

// Generate transaction ID
function generateTransactionId() {
    return 'LX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// ==================== API ROUTES ====================

// Register user with QR image upload
app.post('/api/register', upload.single('qrImage'), (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền tên và upload ảnh QR!' 
            });
        }

        const qrImagePath = '/uploads/qr/' + req.file.filename;
        
        db.run('INSERT INTO users (name, qr_image, created_at) VALUES (?, ?, datetime("now"))', [name, qrImagePath]);
        const result = db.exec('SELECT last_insert_rowid() as id');
        const userId = result[0].values[0][0];
        
        saveDatabase();

        res.json({
            success: true,
            user: {
                id: userId,
                name: name,
                qrImage: qrImagePath
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Save spin result
app.post('/api/spin', (req, res) => {
    try {
        const { userId, prizeName, prizeValue, prizeEmoji } = req.body;

        if (!userId || !prizeName || prizeValue === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu thông tin!' 
            });
        }

        const transactionId = generateTransactionId();
        
        db.run(
            'INSERT INTO spin_results (user_id, transaction_id, prize_name, prize_value, prize_emoji, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
            [userId, transactionId, prizeName, prizeValue, prizeEmoji || '🧧']
        );

        saveDatabase();

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
app.get('/api/history', (req, res) => {
    try {
        const results = db.exec(`
            SELECT sr.id, sr.user_id, sr.transaction_id, sr.prize_name, sr.prize_value, sr.prize_emoji, sr.created_at,
                   u.name as user_name, u.qr_image 
            FROM spin_results sr 
            JOIN users u ON sr.user_id = u.id 
            ORDER BY sr.created_at DESC
        `);

        let data = [];
        if (results.length > 0) {
            const columns = results[0].columns;
            data = results[0].values.map(row => {
                const obj = {};
                columns.forEach((col, i) => obj[col] = row[i]);
                return obj;
            });
        }

        res.json({
            success: true,
            results: data
        });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Get user's spin history
app.get('/api/history/:userId', (req, res) => {
    try {
        const results = db.exec(`
            SELECT sr.id, sr.user_id, sr.transaction_id, sr.prize_name, sr.prize_value, sr.prize_emoji, sr.created_at,
                   u.name as user_name, u.qr_image 
            FROM spin_results sr 
            JOIN users u ON sr.user_id = u.id 
            WHERE sr.user_id = ${req.params.userId}
            ORDER BY sr.created_at DESC
        `);

        let data = [];
        if (results.length > 0) {
            const columns = results[0].columns;
            data = results[0].values.map(row => {
                const obj = {};
                columns.forEach((col, i) => obj[col] = row[i]);
                return obj;
            });
        }

        res.json({
            success: true,
            results: data
        });
    } catch (error) {
        console.error('User history error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Get statistics
app.get('/api/stats', (req, res) => {
    try {
        const totalUsers = db.exec('SELECT COUNT(*) as count FROM users');
        const totalSpins = db.exec('SELECT COUNT(*) as count FROM spin_results');
        const totalPrizeValue = db.exec('SELECT SUM(prize_value) as total FROM spin_results');
        const prizeDistribution = db.exec(`
            SELECT prize_name, COUNT(*) as count, SUM(prize_value) as total_value 
            FROM spin_results 
            GROUP BY prize_name 
            ORDER BY prize_value DESC
        `);

        res.json({
            success: true,
            stats: {
                totalUsers: totalUsers[0]?.values[0][0] || 0,
                totalSpins: totalSpins[0]?.values[0][0] || 0,
                totalPrizeValue: totalPrizeValue[0]?.values[0][0] || 0,
                prizeDistribution: prizeDistribution[0]?.values || []
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Lỗi server!' });
    }
});

// Start server
async function startServer() {
    await initDatabase();
    
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

startServer();
