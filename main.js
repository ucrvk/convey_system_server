//导入区
const express = require('express');
const status = require('./status');
const path = require('path');
const { superUserAutoUpdate } = require('./sql');
const { WORKING_PORT } = require('./settings.json')
const handle = require('./web_handle');
const { userAgentCheckMiddleware, loginCheckMiddleware } = require('./secure')
//基础配置区
const app = express();
const filePath = path.resolve(__dirname, 'data');
superUserAutoUpdate().then(() => console.info('\x1b[32mSuper user auto update success\x1b[0m')).catch((error) => console.error(error));
app.use(express.json());

app.disable('x-powered-by');

app.get('/status', (req, res) => res.json(status()));
app.get('/wives', (req, res) => res.sendFile(filePath + '/8888.jpg'));
app.get('/wives/video', (req, res) => res.sendFile(filePath + '/8888.mp4'));
app.all('/', (req, res) => res.redirect(301, 'https://www.bilibili.com/video/BV1ZUfsYpEXy'));
//限制ua请求
app.use(userAgentCheckMiddleware)
app.post('/login', handle.loginHandle);
//限制登录请求
app.use(loginCheckMiddleware)
app.listen(WORKING_PORT, () => {
    console.info(`\x1b[32mServer is running on 127.0.0.1:${WORKING_PORT}\x1b[0m`);
});