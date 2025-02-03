const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT } = require('./settings.json')

// 定义一个加密密码的函数
function encryptPassword(password) {
    // 使用crypto模块创建一个sha256哈希对象
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 函数jwtSign用于生成JWT令牌，参数id为用户ID
function jwtSign(id) {
    // 使用jwt.sign方法生成令牌，参数为用户ID、密钥和过期时间
    return jwt.sign({ 'id': id }, JWT.SECRET, { expiresIn: JWT.EXPIRED_TIME });
}

// 验证JWT令牌
// 验证JWT令牌是否有效
function jwtVerify(token, id) {
    // 使用JWT库中的verify方法验证令牌，并传入密钥
    try {
        // 验证令牌是否有效
        let content = jwt.verify(token, JWT.SECRET);
        // 如果令牌中的id与传入的id相同，则返回true，否则返回false
        if (content?.id === id) return true;
        return false;
    }
    catch (err) {
        // 如果验证过程中出现错误，则返回false
        return false;
    }
}

module.exports = {
    encryptPassword,
    jwtSign,
    jwtVerify
}