const { jwtSign } = require('./secure');
const sql = require('./sql');
const { userPermissionCheckMiddleware, scorePermissionCheckMiddleware } = require("./middleware")
const { upload } = require('./file_upload');
const path = require('path');
const fs = require('fs');
const mime = require('mime');

//** 登录处理 */
async function loginHandle(req, res) {
    let { username, QQID, password } = req.body;

    // 如果提供了 QQID，则优先使用 QQID 进行登录
    let result;
    if (QQID) {
        result = await sql.userPasswordExamine({ QQID, password });
    } else if (username) {
        result = await sql.userPasswordExamine({ userid: username, password });
    } else {
        return res.status(400).json({ status: 'error', msg: '缺少用户名或QQID' });
    }

    switch (result) {
        case -2:
            return res.status(500).json({ status: 'error', msg: '数据库错误' });
        case -1:
            return res.status(403).json({ status: 'error', msg: '您的账户被禁用，请联系管理人员' });
        case 0:
            return res.status(401).json({ status: 'error', msg: '用户名或密码错误' });
        case -3:
            return res.status(400).json({ status: 'error', msg: '无效的登录凭证' });
        default:
            try {
                let token = jwtSign(result);
                let user = await sql.getUserByID(result);
                const { id, userid, tmpID, QQID, userPermissionLevel, adminRole, score, avatar } = user;
                let userWithoutPassword = { id, userid, tmpID, QQID, userPermissionLevel, adminRole, score, avatar };
                return res.json({ status: 'success', msg: '登录成功', token, user: userWithoutPassword });
            } catch (err) {
                console.error('Error during JWT generation:', err);
                return res.status(500).json({ status: 'error', msg: 'JWT生成失败' });
            }
    }
}

async function updateAvatarHandle(req, res) {
    async function updateAvatar(id, newAvatarUrl) {
        let result = await sql.updateAvatar(id, newAvatarUrl);
        if (result) {
            res.json({ 'status': 'success', 'msg': '头像修改成功' });
        } else {
            console.error('数据库操作未返回预期结果');
            res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    }

    try {
        const { id, newAvatarUrl } = req.body;
        const operator = req.query.operator;

        console.log('收到请求:', req.body, '查询参数:', req.query);

        if (!id || !newAvatarUrl) {
            console.error('缺少必要参数');
            return res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        }

        if (operator !== id) {
            console.log('用户权限检查...');
            await userPermissionCheckMiddleware(req, res, () => updateAvatar(id, newAvatarUrl));
        } else {
            console.log('直接更新头像...');
            await updateAvatar(id, newAvatarUrl);
        }
    } catch (err) {
        console.error('服务器未知错误:', err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

async function updateScoreHandle(req, res) {
    async function updateScore(id, newScore) {
        let result = await sql.updateScore(id, newScore);
        if (result) {
            res.json({ 'status': 'success', 'msg': '积分更新成功' });
        } else {
            console.error('数据库操作未返回预期结果');
            res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    }

    try {
        const { id, newScore } = req.body;
        const operator = req.query.operator;

        console.log('收到请求:', req.body, '查询参数:', req.query);

        if (!id || !newScore) {
            console.error('缺少必要参数');
            return res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        }

        if (operator !== id) {
            console.log('用户权限检查...');
            await scorePermissionCheckMiddleware(req, res, () => updateScore(id, newScore));
        } else {
            console.log('直接更新积分...');
            await updateScore(id, newScore);
        }
    } catch (err) {
        console.error('服务器未知错误:', err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

async function updatePasswordHandle(req, res) {
    async function updatePassword(id, newPassword) {
        let result = await sql.updatePassword(id, newPassword);
        if (result) {
            res.json({ 'status': 'success', 'msg': '密码修改成功' });
        } else {
            console.error('数据库操作未返回预期结果');
            res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    }

    try {
        const { id, newPassword } = req.body;
        const operator = req.query.operator;

        console.log('收到请求:', req.body, '查询参数:', req.query);

        if (!id || !newPassword) {
            console.error('缺少必要参数');
            return res.status(400).json({ 'status': 'error', 'msg': '参数错误' });
        }

        if (operator !== id) {
            console.log('用户权限检查...');
            await userPermissionCheckMiddleware(req, res, () => updatePassword(id, newPassword));
        } else {
            console.log('直接更新密码...');
            await updatePassword(id, newPassword);
        }
    } catch (err) {
        console.error('服务器未知错误:', err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

async function addUserHandle(req, res) {
    try {
        let { userid, QQID, tmpID } = req.body;

        // 检查必需参数
        if (!userid || !QQID) {
            return res.status(400).json({ 'status': 'error', 'msg': '确保已填写用户 ID 和 QQ' });
        }

        // 调用 createUser 函数并获取结果
        let result = await sql.createUser(userid, tmpID, QQID);

        // 根据返回值进行响应处理
        switch (result) {
            case 0:
                res.json({ 'status': 'success', 'msg': '用户添加成功' });
                break;
            case 1:
                res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
                break;
            case 2:
                res.status(409).json({ 'status': 'error', 'msg': '用户 ID 已存在' });
                break;
            case 3:
                res.status(409).json({ 'status': 'error', 'msg': 'QQID 已存在' });
                break;
            default:
                res.status(500).json({ 'status': 'error', 'msg': '未知错误' });
                break;
        }
    } catch (err) {
        console.error('服务器未知错误:', err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器未知错误' });
    }
}

async function updateUserHandle(req, res) {
    try {
        const { operator } = req.query; // 获取操作者 ID
        const updateData = req.body; // 获取请求体中的数据

        // 如果没有提供操作者 ID，返回错误
        if (!operator) {
            return res.status(400).json({ status: 'error', msg: '操作者 ID 不能为空' });
        }

        // 检查请求体是否是数组（批量操作）
        if (Array.isArray(updateData)) {
            // 批量更新逻辑
            const results = [];
            for (const data of updateData) {
                const { id, userid, isEnable } = data;

                // 检查必要的字段
                if (!id || !userid || isEnable === undefined) {
                    results.push({ id, userid, status: 'error', msg: '参数错误' });
                    continue;
                }

                // 查找用户
                const userRecord = await sql.User.findOne({ where: { id, userid } });
                if (!userRecord) {
                    results.push({ id, userid, status: 'error', msg: '用户不存在' });
                    continue;
                }

                // 更新用户状态
                const result = await sql.updateUser(id, { isEnable: Boolean(isEnable) });
                if (result) {
                    results.push({ id, userid, status: 'success', msg: '用户状态更新成功' });
                } else {
                    results.push({ id, userid, status: 'error', msg: '数据库错误' });
                }
            }

            // 返回批量操作结果
            return res.json({ status: 'success', data: results });
        } else {
            // 单个用户更新逻辑
            const { id, userid, QQID, tmpID, isEnable, avatar, adminRole, userPermissionLevel } = updateData;

            // 检查必要的字段
            if (!id || !userid) {
                return res.status(400).json({ status: 'error', msg: '参数错误' });
            }

            // 查找用户
            const userRecord = await sql.User.findOne({ where: { id, userid } });
            if (!userRecord) {
                return res.status(404).json({ status: 'error', msg: '用户不存在' });
            }

            // 构建更新数据对象
            const updateFields = {};
            if (avatar !== undefined && avatar !== null) updateFields.avatar = avatar;
            if (QQID !== undefined && QQID !== null) updateFields.QQID = QQID;
            if (tmpID !== undefined && tmpID !== null) updateFields.tmpID = tmpID;
            if (isEnable !== undefined) updateFields.isEnable = Boolean(isEnable);
            if (adminRole !== undefined && adminRole !== null) updateFields.adminRole = adminRole;
            if (userPermissionLevel !== undefined && userPermissionLevel !== null) updateFields.userPermissionLevel = userPermissionLevel;

            // 如果没有需要更新的字段，返回错误
            if (Object.keys(updateFields).length === 0) {
                return res.status(400).json({ status: 'error', msg: '没有需要更新的数据' });
            }

            // 更新用户数据
            const result = await sql.updateUser(id, updateFields);
            if (result) {
                return res.json({ status: 'success', msg: '用户更新成功' });
            } else {
                return res.status(500).json({ status: 'error', msg: '数据库错误' });
            }
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', msg: '服务器内部错误' });
    }
}

async function dropUserHandle(req, res) {
    try {
        const { id, ids } = req.body;
        const operatorId = req.query.operator;

        // 验证必需参数
        if (!operatorId) {
            console.error("Missing operator ID");
            return res.status(400).json({ status: "error", message: "缺少操作员ID" });
        }

        // 处理单个用户删除
        if (id && !Array.isArray(ids)) {
            if (!id) {
                console.error("Missing user ID for single delete");
                return res.status(400).json({ status: "error", message: "缺少用户ID" });
            }

            console.log(`Attempting to delete user with ID: ${id}`);
            const result = await sql.dropUser(id);
            if (result) {
                console.log(`User with ID ${id} deleted successfully`);
                res.status(200).json({ status: "success", message: "用户删除成功" });
            } else {
                console.error(`Failed to delete user with ID ${id}`);
                res.status(500).json({ status: "error", message: "数据库删除失败" });
            }
        }
        // 处理批量用户删除
        else if (ids && Array.isArray(ids)) {
            if (ids.length === 0) {
                console.error("No user IDs provided for batch delete");
                return res.status(400).json({ status: "error", message: "没有选择要删除的用户" });
            }

            console.log(`Attempting to delete users with IDs: ${ids.join(', ')}`);
            const result = await sql.dropUsers(ids); // 批量删除函数
            if (result) {
                console.log(`Users with IDs ${ids.join(', ')} deleted successfully`);
                res.status(200).json({ status: "success", message: "用户删除成功" });
            } else {
                console.error(`Failed to delete users with IDs ${ids.join(', ')}`);
                res.status(500).json({ status: "error", message: "数据库删除失败" });
            }
        } else {
            console.error("Invalid request parameters");
            return res.status(400).json({ status: "error", message: "无效的请求参数" });
        }
    } catch (err) {
        console.error("Internal server error:", err);
        res.status(500).json({ status: "error", message: "服务器内部错误" });
    }
}

async function getUserHandle(req, res) {
    try {
        let { search, page } = req.query;
        let result = await sql.searchUser(search, page);
        
        // 过滤敏感字段并提取所需信息
        const users = result.result.map(user => {
            const { id, userid, tmpID, QQID, userPermissionLevel, adminRole, score, isEnable } = user;
            return { id, userid, tmpID, QQID, userPermissionLevel, adminRole, score, isEnable };
        });

        res.json({ 
            'status': 'success', 
            'data': users,
            'total': result.totalNumber 
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器错误' });
    }
}
/** 添加活动处理 */
async function addActivityHandle(req, res) {
    try {
        // 从请求体中获取所有需要的参数
        let { name, server, activityDate, startTime, endTime, meetingLocation, finalDestination, score, routeURL, parkingSpotURL, detailOneURL, detailTwoURL, fileName } = req.body;

        // 检查必需的参数是否都存在
        if (!name || !activityDate || !startTime || !endTime || !score || !routeURL || !parkingSpotURL || !detailOneURL || !detailTwoURL || !fileName) {
            return res.status(400).json({ 'status': 'error', 'msg': '缺少必要参数' });
        }

        // 去掉时间中的秒部分
        function removeSeconds(time) {
            const [hours, minutes] = time.split(':').slice(0, 2);
            return `${hours}:${minutes}`;
        }

        // 处理时间和日期
        startTime = removeSeconds(startTime);
        endTime = removeSeconds(endTime);

        // 调用SQL方法添加活动
        let result = await sql.addActivity(name, server, activityDate, startTime, endTime, meetingLocation, finalDestination, score, routeURL, parkingSpotURL, detailOneURL, detailTwoURL, fileName);

        if (result) {
            res.json({ 'status': 'success', 'msg': '活动添加成功' });
        } else {
            res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    } catch (err) {
        console.error('添加活动时发生错误:', err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器内部错误' });
    }
}

async function addActivityFileHandle(req, res) {
    try {
        // 从请求体中获取 fileName 参数
        const { fileName } = req.body;

        // 检查 fileName 是否存在
        if (!fileName) {
            return res.status(400).json({ 'status': 'error', 'msg': '缺少文件名参数' });
        }

        // 调用 SQL 方法，仅保存 fileName
        const result = await sql.addActivityFile(fileName);

        if (result) {
            res.json({ 'status': 'success', 'msg': '文件名保存成功' });
        } else {
            res.status(500).json({ 'status': 'error', 'msg': '数据库错误' });
        }
    } catch (err) {
        console.error('保存文件名时发生错误:', err);
        res.status(500).json({ 'status': 'error', 'msg': '服务器内部错误' });
    }
}

/**
 * 获取最近活动处理
 * @param {Object} req - Express request 对象
 * @param {Object} res - Express response 对象
 */
async function getMostRecentlyActivityHandle(req, res) {
    try {
        // 调用异步函数获取最近的活动记录
        const result = await sql.getMostRecentlyActivity();

        if (result === -1) {
            return res.status(500).json({ status: 'error', msg: '数据库错误' });
        }

        if (result === 0) {
            return res.status(404).json({ status: 'error', msg: '没有最近的活动' });
        }

        // 成功返回活动记录
        return res.json({ status: 'success', data: result });
    } catch (err) {
        console.error('获取最近活动时发生错误:', err);
        return res.status(500).json({ status: 'error', msg: '服务器未知错误' });
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

// 文件上传处理
async function uploadFileHandle(req, res) {
    try {
        upload(req, res, (err) => {
            if (err) {
                console.error('上传错误详情:', {
                    message: err.message,
                    code: err.code,
                    stack: err.stack
                });

                let message = '文件上传失败';
                if (err.code === 'LIMIT_FILE_SIZE') message = '文件超过1GB限制';
                if (err.message.includes('ZIP')) message = '仅支持ZIP格式';

                return res.status(400).json({ 
                    status: 'error',
                    message,
                    detail: err.message 
                });
            }

            if (!req.file) {
                return res.status(400).json({ 
                    status: 'error',
                    message: '未接收到文件'
                });
            }

            // 获取保存的 UUID
            const uniqueId = req.file.filename.split('.')[0];

            res.json({
                status: 'success',
                data: {
                    filename: req.file.filename,
                    size: req.file.size,
                    path: req.file.path,
                    uniqueId: uniqueId
                }
            });
        });
    } catch (err) {
        console.error('全局上传捕获:', err);
        res.status(500).json({ 
            status: 'error',
            message: '服务器处理异常'
        });
    }
}

// 获取 UUID 从本地存储
function getUniqueIdFromLocalStorage() {
    const localStoragePath = path.join(__dirname, 'file-uuid.json');
    if (!fs.existsSync(localStoragePath)) {
        return null;
    }
    const storedData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
    return storedData.uuid;
}

// 文件下载处理
async function downloadFileHandle(req, res) {
    try {
        const uniqueId = getUniqueIdFromLocalStorage(); // 从本地存储获取 UUID

        if (!uniqueId) {
            return res.status(404).json({ 
                status: 'error',
                message: '未找到唯一标识符'
            });
        }

        const uploadsDir = path.resolve(__dirname, '../data/uploads');
        const requestedPath = path.resolve(uploadsDir, `${uniqueId}.zip`);

        // 强化路径遍历防护
        if (!requestedPath.startsWith(uploadsDir)) {
            console.warn(`潜在路径遍历攻击尝试: ${requestedPath}`);
            return res.status(400).json({ 
                status: 'error',
                message: '非法文件路径'
            });
        }

        // 检查文件存在性
        if (!fs.existsSync(requestedPath)) {
            return res.status(404).json({ 
                status: 'error',
                message: '文件不存在'
            });
        }

        // 获取文件状态
        const stats = fs.statSync(requestedPath);
        if (!stats.isFile()) {
            return res.status(400).json({ 
                status: 'error',
                message: '请求的不是文件'
            });
        }

        // 确定MIME类型
        const mimetype = 'application/zip'; // 强制指定ZIP类型

        // 设置响应头
        res.header({
            'Content-Type': mimetype,
            'Content-Disposition': `attachment; filename="file.zip"`, // 固定下载文件名
            'Content-Length': stats.size,
            'Cache-Control': 'private, max-age=3600' // 1小时缓存
        });

        // 使用流式传输并添加错误处理
        const readStream = fs.createReadStream(requestedPath);
        
        readStream.on('error', (err) => {
            console.error('文件流错误:', err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    status: 'error',
                    message: '文件传输失败'
                });
            }
        });

        readStream.pipe(res);

    } catch (err) {
        console.error('下载处理错误:', err);
        res.status(500).json({ 
            status: 'error',
            message: '服务器处理下载请求时发生错误',
            detail: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

module.exports = {
    loginHandle,
    updateAvatarHandle,
    updateScoreHandle,
    updatePasswordHandle,
    addActivityHandle,
    addActivityFileHandle,
    dropUserHandle,
    downloadFileHandle,
    uploadFileHandle,
    getMostRecentlyActivityHandle,
    searchActivityHandle,
    addUserHandle,
    getUserHandle,
    updateUserHandle
}