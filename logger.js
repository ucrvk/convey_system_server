const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logs = [];
        this.listeners = [];
        this.currentDate = new Date().toISOString().slice(0, 10); // 初始日期
        this.logDir = path.join(__dirname, 'logs');
        this.ensureLogDir();
        setInterval(() => this.checkDate(), 60000); // 每分钟检查日期变更
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir);
        }
    }

    getLogFilePath(date) {
        return path.join(this.logDir, `${date}.log`);
    }

    checkDate() {
        const newDate = new Date().toISOString().slice(0, 10);
        if (newDate !== this.currentDate) {
            this.currentDate = newDate;
        }
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        // 存储到内存
        this.logs.push(logEntry);
        
        // 写入文件
        const filePath = this.getLogFilePath(this.currentDate);
        fs.appendFileSync(filePath, logEntry + '\n', 'utf8');

        // 广播给监听器
        this.listeners.forEach(listener => listener(logEntry));
    }

    // 新增获取历史日志方法
    getHistoryLogs(date) {
        try {
            const filePath = this.getLogFilePath(date);
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    // 新增获取可用日志日期方法
    getAvailableDates() {
        try {
            return fs.readdirSync(this.logDir)
                .map(f => f.replace(/\.log$/, ''))
                .filter(d => /\d{4}-\d{2}-\d{2}/.test(d));
        } catch (error) {
            return [];
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }
}

module.exports = new Logger();