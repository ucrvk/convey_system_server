const { memoryUsage } = require('process');
const { totalmem, freemem } = require('os');
// 定义一个status函数，用于返回系统状态
function status() {
    const memory_usage = memoryUsage().rss;
    return {
        status: 'OK',
        memory: {
            total: `${totalmem()/1024/1024}M`,
            free: `${freemem()/1024/1024}M`,
            used: `${memory_usage/1024/1024}M`
        },
        uptime: `${process.uptime()/60/60}h`
    }
}
module.exports = status;