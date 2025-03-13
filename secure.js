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
        if (content?.id == id) return true;
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
const PERMISSION_BITS = {
    activity: 1, // 第1位
    score: 2,    // 第2位
    user: 3      // 第3位
};

function userPermissionLevelCheck(permissionName, permissionLevel) {
    if (typeof permissionLevel !== 'number' || permissionLevel < 0 || permissionLevel > 15) {
        console.error('无效的权限级别:', permissionLevel);
        return false;
    }

    if (permissionName === 'super') {
        return permissionLevel === 15; // 超级管理员权限级别为15 (二进制: 1111)
    }

    const bitPosition = PERMISSION_BITS[permissionName];

    if (bitPosition === undefined) {
        console.error('未知的权限名称:', permissionName);
        return false;
    }

    // 计算对应位是否为1
    // 使用按位与操作来检查特定位置的位是否为1
    return (permissionLevel & (1 << bitPosition)) !== 0;
}



module.exports = {
    encryptPassword,
    jwtSign,
    jwtVerify,
    userPermissionLevelCheck
}