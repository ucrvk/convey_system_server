const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT } = require('./settings.json')
/**sha256无盐加密*/
function encryptPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
function examinePassword(password, hashedPassword) {
    return encryptPassword(password) === hashedPassword;
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

const PERMISSION_BITS = {
    item: 0,     // 商品管理 (1 << 0 = 1)
    user: 1,     // 用户管理 (1 << 1 = 2)
    activity: 2, // 活动管理 (1 << 2 = 4)
    score: 3     // 积分管理 (1 << 3 = 8)
};

/**
 * 验证权限组合是否有效（辅助函数）
 * @param {number} permissionLevel 
 * @returns {boolean} 是否为有效组合（最多3个权限）
 */
function isValidCombination(permissionLevel) {
    if (permissionLevel === 15) return true; // 超级管理员
    const bitCount = permissionLevel.toString(2).split('1').length - 1;
    return bitCount <= 3;
}

/**
 * 权限校验函数（支持多种管理组合）
 * @param {('super'|'item'|'user'|'activity'|'score')} permissionName 
 * @param {number} permissionLevel 
 * @returns {boolean} 是否拥有权限
 */
function userPermissionLevelCheck(permissionName, permissionLevel) {
    // 有效性检查
    if (!isValidCombination(permissionLevel) || permissionLevel < 0 || permissionLevel > 15) {
        console.error('无效的权限组合:', permissionLevel);
        return false;
    }

    // 超级管理员校验
    if (permissionName === 'super') {
        return permissionLevel === 15;
    }

    // 普通权限校验
    const bitPosition = PERMISSION_BITS[permissionName];
    if (bitPosition === undefined) {
        console.error('未知的权限名称:', permissionName);
        return false;
    }

    // 位运算校验
    return (permissionLevel & (1 << bitPosition)) !== 0;
}

/**
 * 示例权限组合：
 * ------------------------------------------
 * | 组合名称               | 权限值 | 二进制 |
 * |------------------------|--------|--------|
 * | 用户+商品+活动        | 7      | 0111   |
 * | 用户+积分+活动        | 14     | 1110   |
 * | 积分+商品             | 9      | 1001   |
 * | 超级管理员            | 15     | 1111   |
 * ------------------------------------------
 */
// 商品管理 (1)
// 用户管理 (2)
// 活动管理 (4)
// 积分管理 (8)



module.exports = {
    encryptPassword,
    jwtSign,
    jwtVerify,
    userPermissionLevelCheck,
    examinePassword
}