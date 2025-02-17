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
        const id = req.body.operator;
        let permissionCode = await getUserByID(id);
        userPermissionLevelCheck("activity", permissionCode.userPermissionLevel) ? next() : res.status(403).json({ "status": "error", "message": "您没有权限" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ "status": "error", "message": "服务器错误" });
    }
}
/**检查用户是否有用户管理权限 */
async function userPermissionCheckMiddleware(req, res, next) {
    try {
        const id = req.body.operator;
        let permissionCode = await getUserByID(id);
        userPermissionLevelCheck("user", permissionCode.userPermissionLevel) ? next() : res.status(403).json({ "status": "error", "message": "您没有权限" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ "status": "error", "message": "服务器错误" });
    }
}

module.exports = {
    userAgentCheckMiddleware,
    loginCheckMiddleware,
    activityPermissionCheckMiddleware,
    userPermissionCheckMiddleware
}