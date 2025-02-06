const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT } = require('./settings.json')

/**sha256无盐加密*/
function encryptPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/** 使用id签名*/
function jwtSign(id) {
    return jwt.sign({ 'id': id }, JWT.SECRET, { expiresIn: JWT.EXPIRED_TIME });
}

/**
 * 验证jwt token
 * @param {string} token 
 * @param {number} id 系统id，不是用户id
 * @returns 只有token有效且请求中id和token的id一致返回true，否则返回false
 */
function jwtVerify(token, id) {
    try {
        let content = jwt.verify(token, JWT.SECRET);
        if (content?.id === id) return true;
        return false;
    }
    catch (err) {
        return false;
    }
}

/**
 * 处理输入的函数，只接受四个特定的字符
 * @param {('super'|'score'|'activity'|'user')} input 只能是那四个
 * @param {number} permissionLevel 权限等级
 * @returns {boolean} 是否拥有权限
 */
function userPermissionLevelCheck(permissionName, permissionLevel) {
    if (permissionName === 'super' && permissionLevel === 15) return true;
    let bytePermissionLevel = permissionLevel.toString(2).padStart(4, '0')
    switch (bytePermissionLevel) {
        case 'activity': return bytePermissionLevel[1] === '1';
        case 'score': return bytePermissionLevel[2] === '1';
        case 'user': return bytePermissionLevel[3] === '1';
        default: return false;
    }
}

function userAgentCheckMiddleware(req, res, next) {
    const allowedHeader = /^convey_system_alpha_1\.0\.\d+$/
    if (!allowedHeader.test(req.headers['user-agent'])) res.status(403).json({ "status": "error", "message": "user-agent not allowed" });
    else next();
}

function loginCheckMiddleware(req, res, next) {
    const id = req.body.operator;
    if (!id) res.status(400).json({ "status": "error", "message": "no operator id" });
    else if (!jwtVerify(req.headers['authorization'], id)) res.status(401).json({ "status": "error", "message": "invalid token" });
    else next();
}

module.exports = {
    encryptPassword,
    jwtSign,
    jwtVerify,
    userPermissionLevelCheck,
    userAgentCheckMiddleware,
    loginCheckMiddleware
}