const { jwtSign } = require('./secure');
const sql = require('./sql');
const { userPermissionCheckMiddleware } = require("./middleware")

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


async function updatePasswordHandle(req, res) {
    async function updatePassword(req, res) {
        let result = await sql.updatePassword(req.body.target, req.body.newPassword);
        if (result) {
            res.json({ 'status': 'success', 'msg': '密码修改成功' });
        }
        else {
            console.error(err);
            res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    }
    try {
        if (!req.body.target || req.body.newPassword) res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        else if (req.body.operator != req.body.target) await userPermissionCheckMiddleware(req, res, updatePassword);
        else await updatePassword(req.body.target, req.body.newPassword);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}
async function addUserHandle(req, res) {
    try {
        let { userid, QQID, tmpID } = req.body;
        if (!userid) res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        else {
            let result = await sql.createUser(userid, tmpID, QQID);
            switch (result) {
                case (2): res.status(409).json({ 'status': 'error', 'msg': '用户已存在' }); break;
                case (1): res.status(500).json({ 'status': 'error', 'msg': '数据库错误' }); break;
                case (0): res.json({ 'status': 'success', 'msg': '用户添加成功' }); break;
            }
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

async function updateUserHandle(req, res) {
    try {
        let { userid, QQID, tmpID, isEnable } = req.body;
        if (isEnable == undefined) isEnable = true;
        if (!userid) res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        else {
            let result = await sql.updateUser(userid, tmpID, QQID, isEnable);
            if (result) res.json({ 'status': 'success', 'msg': '用户更新成功' });
            else res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
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
    updatePasswordHandle,
    addActivityHandle,
    getMostRecentlyActivityHandle,
    searchActivityHandle,
    addUserHandle,
    updateUserHandle
}