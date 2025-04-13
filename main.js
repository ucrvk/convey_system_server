// 导入区
const express = require('express');
const status = require('./status');
const path = require('path');
const { superUserAutoUpdate } = require('./sql');
const { WORKING_PORT } = require('./settings.json');
const handle = require('./web_handle');
const middleware = require('./middleware');
const botApi = require('./bot_api');
const logger = require('./logger'); // 引入日志管理器
const WebSocket = require('ws');

// 基础配置区
const app = express(); // 初始化 Express 应用
const filePath = path.resolve(__dirname, 'data');

// 启动时的日志记录
logger.log('info', '正在初始化应用程序...');

// 初始化超级用户
superUserAutoUpdate()
    .then(() => logger.log('info', '超级用户自动更新成功。'))
    .catch((error) => logger.log('error', `超级用户自动更新失败: ${error}`));

// 中间件
logger.log('info', '正在设置中间件...');
app.use(express.json()); // 解析 JSON 请求体
app.disable('x-powered-by'); // 禁用 X-Powered-By 头
logger.log('info', '中间件设置完成。');

// 状态路由
logger.log('info', '正在注册状态路由...');
app.get('/status', (req, res) => {
    logger.log('info', '收到请求: GET /status');
    res.json(status());
});

// 静态文件路由
logger.log('info', '正在注册静态文件路由...');
app.get('/wives', (req, res) => {
    logger.log('info', '收到请求: GET /wives');
    res.sendFile(filePath + '/8888.jpg');
});

// 登录路由
logger.log('info', '正在注册登录路由...');
app.post('/login', (req, res, next) => {
    logger.log('info', '收到请求: POST /login');
    handle.loginHandle(req, res, next);
});

// truckersMP API 路由
logger.log('info', '正在注册 truckersMP API 路由...');
app.get('/player/:tmpId', (req, res, next) => {
    logger.log('info', `收到请求: GET /player/${req.params.tmpId}`);
    handle.getPlayerInfoHandle(req, res, next);
});
app.get('/servers', (req, res, next) => {
    logger.log('info', '收到请求: GET /servers');
    handle.getServersHandle(req, res, next);
});
app.get('/bans/:tmpId', (req, res, next) => {
    logger.log('info', `收到请求: GET /bans/${req.params.tmpId}`);
    handle.getBansHandle(req, res, next);
});
app.get('/version', (req, res, next) => {
    logger.log('info', '收到请求: GET /version');
    handle.getVersionHandle(req, res, next);
});
app.get('/vtc/:vtcId/member/:memberId', (req, res, next) => {
    logger.log('info', `收到请求: GET /vtc/${req.params.vtcId}/member/${req.params.memberId}`);
    handle.getVtcMemberHandle(req, res, next);
});
app.get('/gametime', (req, res, next) => {
    logger.log('info', '收到请求: GET /gametime');
    handle.getGameTimeHandle(req, res, next);
});

// 限制登录请求
logger.log('info', '正在应用登录检查中间件...');
app.use(middleware.loginCheckMiddleware);

// 用户类路由
logger.log('info', '正在注册用户类路由...');
app.post('/user/updatepassword', middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在修改密码`);
    handle.updatePasswordHandle(req, res, next);
});
app.post("/user", middleware.permissionCheckMiddleware('user'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const targetUser = req.body.username || '未知用户';
    logger.log('info', `用户 ${operatorId} 正在添加新用户: ${targetUser}`);
    handle.addUserHandle(req, res, next);
});
app.put('/user', middleware.permissionCheckMiddleware('user'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const targetUserId = req.body.userId || '未知用户ID';
    logger.log('info', `用户 ${operatorId} 正在更新用户信息: ${targetUserId}`);
    handle.updateUserHandle(req, res, next);
});
app.delete('/user', middleware.permissionCheckMiddleware('user'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const targetUserId = req.body.userId || '未知用户ID';
    logger.log('info', `用户 ${operatorId} 正在删除用户: ${targetUserId}`);
    handle.dropUserHandle(req, res, next);
});
app.get('/user', middleware.permissionCheckMiddleware('user'), (req, res, next) => {
    const operatorId = req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在查询用户列表`);
    handle.getUserHandle(req, res, next);
});
app.post("/user/update-avatar", middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在更新头像`);
    handle.updateAvatarHandle(req, res, next);
});
app.post("/user/update-score", middleware.permissionCheckMiddleware('score'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const targetUserId = req.body.userId || '未知用户ID';
    const scoreChange = req.body.score || 0;
    logger.log('info', `用户 ${operatorId} 正在修改用户 ${targetUserId} 的积分: ${scoreChange}`);
    handle.updateScoreHandle(req, res, next);
});

// 活动类路由
logger.log('info', '正在注册活动类路由...');
app.post("/activity", middleware.permissionCheckMiddleware('activity'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const activityName = req.body.activityName || '未知活动';
    logger.log('info', `用户 ${operatorId} 正在创建新活动: ${activityName}`);
    handle.addActivityHandle(req, res, next);
});
app.post("/activity/file", middleware.permissionCheckMiddleware('activity'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const fileName = req.body.fileName || '未知文件';
    logger.log('info', `用户 ${operatorId} 正在上传活动文件: ${fileName}`);
    handle.addActivityFileHandle(req, res, next);
});
app.get("/activity", middleware.permissionCheckMiddleware('activity'), (req, res, next) => {
    const operatorId = req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在查询活动列表`);
    handle.searchActivityHandle(req, res, next);
});
app.get('/activity/recently', (req, res, next) => {
    logger.log('info', '收到请求: GET /activity/recently');
    handle.getMostRecentlyActivityHandle(req, res, next);
});

// 文件上传路由
logger.log('info', '正在注册文件上传路由...');
app.post('/file/upload', middleware.loginCheckMiddleware, middleware.permissionCheckMiddleware('activity'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const fileName = req.body.fileName || '未知文件';
    logger.log('info', `用户 ${operatorId} 正在上传文件: ${fileName}`);
    handle.uploadFileHandle(req, res, next);
});

// 文件下载路由
app.get('/file/download', middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.query.operator;
    const fileName = req.query.fileName || '未知文件';
    logger.log('info', `用户 ${operatorId} 正在下载文件: ${fileName}`);
    handle.downloadFileHandle(req, res, next);
});

// 积分商城路由
logger.log('info', '正在注册积分商城路由...');
app.get('/shop', middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在访问商城管理`);
    handle.getShopHandle(req, res, next);
});
app.post('/pointshop', middleware.loginCheckMiddleware, middleware.permissionCheckMiddleware('item'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const productName = req.body.name || '未知商品';
    logger.log('info', `用户 ${operatorId} 正在添加积分商品: ${productName}`);
    handle.addPointsproductsHandle(req, res, next);
});
app.delete('/pointshop', middleware.loginCheckMiddleware, middleware.permissionCheckMiddleware('item'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const productId = req.body.id || '未知商品ID';
    logger.log('info', `用户 ${operatorId} 正在删除积分商品: ${productId}`);
    handle.dropPointsproductsHandle(req, res, next);
});
app.post('/pointshop/update', middleware.loginCheckMiddleware, middleware.permissionCheckMiddleware('item'), (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const productId = req.body.id || '未知商品ID';
    logger.log('info', `用户 ${operatorId} 正在更新积分商品: ${productId}`);
    handle.updatePointsproductsHandle(req, res, next);
});
app.get("/pointshop", middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在查询积分商品信息`);
    handle.getShopInfoHandle(req, res, next);
});
app.post('/purchase-item', middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.body.operator || req.query.operator;
    const productId = req.body.id || '未知商品ID';
    logger.log('info', `用户 ${operatorId} 正在购买商品: ${productId}`);
    handle.purchaseItemHandle(req, res, next);
});
app.get("/purchase-history", middleware.loginCheckMiddleware, (req, res, next) => {
    const operatorId = req.query.operator;
    logger.log('info', `用户 ${operatorId} 正在查询购买记录`);
    handle.getUserPurchaseHistoryHandle(req, res, next);
});
//机器人接口
app.get('/bot/getActivity', botApi.botGetMostRecentlyActivity)
app.get('/bot/bindUser', botApi.botBindUser)
app.get('/bot/userScore', botApi.botGetUserScore)

// 添加在路由注册区域之后，服务器启动之前(切记不要改位置)
app.get('/logs/dates', (req, res) => {
    logger.log('info', '收到请求: GET /logs/dates');
    res.json({ dates: logger.getAvailableDates() });
});

app.get('/logs/:date', (req, res) => {
    logger.log('info', `收到请求: GET /logs/${req.params.date}`);
    const logs = logger.getHistoryLogs(req.params.date);
    res.json({ logs });
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ port: 8081 }); // 使用 8081 端口
logger.log('info', 'WebSocket 服务器已启动，端口: 8081。');

// 监听 WebSocket 连接
wss.on('connection', (ws) => {
    logger.log('info', '新的 WebSocket 客户端已连接。');

    // 注册监听器，当有新日志时推送给客户端
    const listener = (logEntry) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(logEntry); // 发送日志到客户端
        }
    };
    logger.subscribe(listener);

    // 监听客户端断开连接
    ws.on('close', () => {
        logger.log('info', 'WebSocket 客户端已断开连接。');
        // 移除监听器
        logger.listeners = logger.listeners.filter(l => l !== listener);
    });
});

// 启动服务器
logger.log('info', `正在启动服务器，端口: ${WORKING_PORT}...`);
app.listen(WORKING_PORT, () => {
    logger.log('info', `服务器已启动，运行在 http://127.0.0.1:${WORKING_PORT}`);
});