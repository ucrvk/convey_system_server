// 导入区
const express = require('express');
const status = require('./status');
const path = require('path');
const { superUserAutoUpdate } = require('./sql');
const { WORKING_PORT } = require('./settings.json');
const handle = require('./web_handle');
const middleware = require('./middleware');

// 基础配置区
const app = express(); // 初始化 Express 应用
const filePath = path.resolve(__dirname, 'data');

// 初始化超级用户
superUserAutoUpdate()
    .then(() => console.info('\x1b[32mSuper user auto update success\x1b[0m'))
    .catch((error) => console.error(error));

// 中间件
app.use(express.json()); // 解析 JSON 请求体
app.disable('x-powered-by'); // 禁用 X-Powered-By 头

// 状态路由
app.get('/status', (req, res) => res.json(status()));

// 静态文件路由
app.get('/wives', (req, res) => res.sendFile(filePath + '/8888.jpg'));

// 登录路由
app.post('/login', handle.loginHandle);

// 限制登录请求
app.use(middleware.loginCheckMiddleware);

// 用户类路由
app.post('/user/updatepassword', middleware.loginCheckMiddleware, handle.updatePasswordHandle);
app.post("/user", middleware.userPermissionCheckMiddleware, handle.addUserHandle);
app.put('/user', middleware.userPermissionCheckMiddleware, handle.updateUserHandle);
app.delete('/user', middleware.userPermissionCheckMiddleware, handle.dropUserHandle);
app.get('/user', middleware.loginCheckMiddleware, handle.getUserHandle);
app.post("/user/update-avatar", middleware.loginCheckMiddleware, handle.updateAvatarHandle);
app.post("/user/update-score", middleware.scorePermissionCheckMiddleware, handle.updateScoreHandle);

// 活动类路由
app.post("/activity", middleware.activityPermissionCheckMiddleware, handle.addActivityHandle);
app.post("/activity/file", middleware.activityPermissionCheckMiddleware, handle.addActivityFileHandle);
app.get("/activity", middleware.activityPermissionCheckMiddleware, handle.searchActivityHandle);
app.get('/activity/recently', handle.getMostRecentlyActivityHandle);

// 文件上传路由
app.post('/file/upload', middleware.loginCheckMiddleware, middleware.activityPermissionCheckMiddleware, handle.uploadFileHandle);

// 文件下载路由
app.get('/file/download', middleware.loginCheckMiddleware, handle.downloadFileHandle);

// 启动服务器
app.listen(WORKING_PORT, () => {
    console.info(`\x1b[32mServer is running on 127.0.0.1:${WORKING_PORT}\x1b[0m`);
});
