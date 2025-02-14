const { jwtSign } = require('./secure');
const sql = require('./sql');

//** 登录处理 */
async function loginHandle(req, res) {
    let { username, password } = req.body;
    let result = await sql.userPasswordExamine(username, password);
    switch (result) {
        case (-2): res.status(500).json({ 'status': 'error', 'msg': '数据库错误' }); break;
        case (-1): res.status(403).json({ 'status': 'error', 'msg': '您的账户被禁用，请联系管理人员' }); break;
        case (0): res.status(401).json({ 'status': 'error', 'msg': '用户名或密码错误' }); break;
        default: {
            try {
                let token = jwtSign(result);
                let user = await sql.getUserByID(result);
                const { id, userid, tmpID, QQID, userPermissionLevel, score } = user;
                let userWithoutPassword = { id, userid, tmpID, QQID, userPermissionLevel, score };
                res.json({ 'status': 'success', 'msg': '登录成功', 'token': token, 'user': userWithoutPassword });
            }
            catch (err) {
                res.status(500).json({ 'status': 'error', 'msg': 'jwt生成失败' });
            }
        }
    }
}


//** 添加活动处理 */
async function addActivityHandle(req, res) {
    try {
        let { name, server, startTime, endTime, score } = req.body;
        if (!name || !server || !startTime || !endTime || !score) {
            res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        }
        else {
            let result = await sql.addActivity(name, server, startTime, endTime, score);
            if (result) {
                res.json({ 'status': 'success', 'msg': '活动添加成功' });
            }
            else {
                res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
            }
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
    }
}

//** 获取最近活动处理 */
async function getMostRecentlyActivityHandle(req, res) {
    try {
        let result = await sql.getMostRecentlyActivity();
        if (result == -1) res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        if (result == 0) res.status(404).json({ 'status': 'error', 'msg': '没有最近的活动' });
        res.json({ 'status': 'success', 'data': result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

async function searchActivityHandle(req, res) {
    try {
        let { name, server } = req.body;
        if (!name || !server) {

        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

module.exports = {
    loginHandle,
    addActivityHandle,
    getMostRecentlyActivityHandle
}