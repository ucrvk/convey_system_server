import { memoryUsage } from 'process';
import { totalmem, freemem } from 'os';
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
export default status;