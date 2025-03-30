const { jwtVerify, userPermissionLevelCheck } = require("./secure");
const { getUserByID } = require('./sql');

// 登录检查中间件
function loginCheckMiddleware(req, res, next) {
    const id = req.body.operator || req.query.operator;
    if (req.path.startsWith('/logs')) {
        return next();
    }
    if (!id) {
        return res.status(400).json({ "status": "error", "message": "no operator id" });
    }
    if (!jwtVerify(req.headers['authorization'].split(' ')[1], id)) {
        return res.status(401).json({ "status": "error", "message": "token失效。请尝试重新登录" });
    }
    next();
}

/**
 * 统一权限检查中间件
 * @param {...string} requiredPermissions 需要的权限名称（可变参数）
 * @returns {Function} 中间件函数
 */
function permissionCheckMiddleware(...requiredPermissions) {
    return async function (req, res, next) {
        try {
            // 获取操作者ID
            const id = req.query.operator || req.body.operator;

            if (!id) {
                return res.status(400).json({ "status": "error", "message": "缺少操作者ID" });
            }

            // 获取用户的权限级别
            const user = await getUserByID(id);

            if (!user || !user.userPermissionLevel) {
                console.error(`无法找到用户ID: ${id} 或其权限信息`);
                return res.status(404).json({ "status": "error", "message": "用户不存在或无权限信息" });
            }

            // 检查用户是否拥有所有需要的权限
            const hasAllPermissions = requiredPermissions.every(permission => 
                userPermissionLevelCheck(permission, user.userPermissionLevel)
            );

            if (hasAllPermissions) {
                next();
            } else {
                res.status(403).json({ "status": "error", "message": "您没有权限" });
            }
        } catch (err) {
            console.error('权限检查中间件发生错误:', err);
            res.status(500).json({ "status": "error", "message": "服务器错误" });
        }
    };
}

module.exports = {
    loginCheckMiddleware,
    permissionCheckMiddleware // 导出统一的权限检查中间件
};