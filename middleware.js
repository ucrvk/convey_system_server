const { jwtVerify, userPermissionLevelCheck } = require("./secure")
const { getUserByID } = require('./sql')

function loginCheckMiddleware(req, res, next) {
    const id = req.body.operator || req.query.operator;
    if (!id) res.status(400).json({ "status": "error", "message": "no operator id" });
    else if (!jwtVerify(req.headers['authorization'].split(' ')[1], id)) res.status(401).json({ "status": "error", "message": "token失效。请尝试重新登录" });
    else next();
}

/** 检查用户是否有活动管理权限*/
async function activityPermissionCheckMiddleware(req, res, next) {
    try {
        // 获取操作者ID
        const id = req.query.operator;

        if (!id) {
            return res.status(400).json({ "status": "error", "message": "缺少操作者ID" });
        }

        // 获取用户的权限级别
        let permissionCode = await getUserByID(id);

        if (!permissionCode || !permissionCode.userPermissionLevel) {
            console.error(`无法找到用户ID: ${id} 或其权限信息`);
            return res.status(404).json({ "status": "error", "message": "用户不存在或无权限信息" });
        }

        // 权限检查
        if (userPermissionLevelCheck("user", permissionCode.userPermissionLevel)) {
            next();
        } else {
            res.status(403).json({ "status": "error", "message": "您没有权限" });
        }
    } catch (err) {
        console.error('权限检查中间件发生错误:', err);
        res.status(500).json({ "status": "error", "message": "服务器错误" });
    }
}
/** 检查用户是否有用户管理权限 */
async function userPermissionCheckMiddleware(req, res, next) {
    try {
        // 从查询字符串中获取 operator 参数
        const id = req.query.operator;
        
        if (!id) {
            return res.status(400).json({ "status": "error", "message": "缺少必要参数id" });
        }

        let permissionCode = await getUserByID(id);
        
        if (!permissionCode || !permissionCode.userPermissionLevel) {
            return res.status(400).json({ "status": "error", "message": "无效的用户ID" });
        }

        const userPermissionLevelCheck = (role, level) => {
            // 管理员权限为 15，普通用户权限为 1
            const REQUIRED_PERMISSION_LEVEL = 15;
            return level <= REQUIRED_PERMISSION_LEVEL;
        };

        userPermissionLevelCheck("user", permissionCode.userPermissionLevel) ? next() : res.status(403).json({ "status": "error", "message": "您没有权限" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "status": "error", "message": "服务器错误" });
    }
}

module.exports = {
    loginCheckMiddleware,
    activityPermissionCheckMiddleware,
    userPermissionCheckMiddleware
}