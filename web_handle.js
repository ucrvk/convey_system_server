const { jwtSign, jwtVerify } = require('./secure');
const sql = require('./sql');

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
                res.json({ 'status': 'success', 'msg': '登录成功', 'token': token });
            }
            catch (err) {
                res.status(500).json({ 'status': 'error', 'msg': 'jwt生成失败' });
            }
        }
    }
}

module.exports = {
    loginHandle
}