const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// 设置上传目录
const uploadDir = path.resolve(__dirname, '../data/uploads');

// 文件存储配置
const storageSaving = multer.diskStorage({
    destination: (req, file, cb) => {
        // 确保上传目录存在
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const newFilename = `${uniqueId}.zip`; // 强制使用.zip扩展名
        cb(null, newFilename);

        // 保存 UUID 到本地存储
        saveUniqueIdToLocalStorage(uniqueId);
    }
});

// 创建 multer 实例
const upload = multer({
    storage: storageSaving,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 限制文件大小为1GB
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.zip') {
            return cb(new Error('仅支持ZIP格式'), false);
        }
        cb(null, true);
    }
}).single('file'); // 假设上传字段名为 'file'

// 保存 UUID 到本地存储
function saveUniqueIdToLocalStorage(uniqueId) {
    // 清除旧文件
    clearOldFile();

    // 将新的 UUID 保存到本地存储
    const localStoragePath = path.join(__dirname, 'file-uuid.json');
    fs.writeFileSync(localStoragePath, JSON.stringify({ uuid: uniqueId }), 'utf8');
}

// 清除旧文件
function clearOldFile() {
    const localStoragePath = path.join(__dirname, 'file-uuid.json');
    if (fs.existsSync(localStoragePath)) {
        const storedData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
        if (storedData.uuid) {
            const oldFilePath = path.resolve(uploadDir, `${storedData.uuid}.zip`);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath); // 删除旧文件
            }
        }
    }
}

module.exports = {
    upload
};