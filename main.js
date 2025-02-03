//导入区
const express = require('express');
const status = require('./status');
const path = require('path');
const sql = require('./sql');
const { WORKING_PORT } = require('./settings.json')
//基础配置区
const app = express();
const filePath =path.resolve(__dirname,'data');
sql.superUserAutoUpdate().then(() => console.info('\x1b[32mSuper user auto update success\x1b[0m')).catch((error) => console.error(error));
app.disable('x-powered-by');


app.get('/status', (req, res) => res.json(status()));
app.get('/wives', (req, res) => res.sendFile(filePath+'/8888.jpg'));
app.all('*', (req, res) => res.redirect(301, 'https://www.bilibili.com/video/BV1ZUfsYpEXy'));


app.listen(WORKING_PORT, () => {
    console.info(`\x1b[32mServer is running on 127.0.0.1:${WORKING_PORT}\x1b[0m`);
});