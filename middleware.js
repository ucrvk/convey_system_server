const { jwtVerify, userPermissionLevelCheck } = require("./secure");
const { getUserByID } = require('./sql');

// 登录检查中间件
function loginCheckMiddleware(req, res, next) {
    // 豁免路径列表（不需要 operator id 和 token 验证的路径）
    const exemptPaths = [
        '/status',           // 状态检查
        '/wives',            // 静态文件
        '/login',            // 登录路由
        '/player/',          // truckersMP 玩家信息查询
        '/servers',          // truckersMP 服务器列表
        '/bans/',           // truckersMP 封禁记录
        '/version',          // truckersMP 版本信息
        '/vtc/',            // truckersMP VTC 成员查询
        '/gametime',        // truckersMP 游戏时间
        '/logs',             // 日志查询
        '/activity/recently', // 近期活动（无需登录）
        '/bot'
    ];

    // 检查当前路径是否在豁免列表中
    const isExempt = exemptPaths.some(path => req.path.startsWith(path));

    if (isExempt) {
        return next(); // 直接放行，不检查 operator id 和 token
    }

    // 非豁免路径，检查 operator id
    const id = req.body.operator || req.query.operator;
    if (!id) {
        return res.status(400).json({ "status": "error", "message": "no operator id" });
    }

    // 检查 Authorization 头是否存在
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ "status": "error", "message": "缺少 Authorization 头" });
    }

    // 提取并验证 JWT token
    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token || !jwtVerify(token, id)) {
        return res.status(401).json({ "status": "error", "message": "token失效。请尝试重新登录" });
    }

    next(); // 验证通过，继续后续处理
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