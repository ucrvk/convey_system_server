const sql = require('./sql');
const BOT = require('./settings.json').BOT

async function botGetMostRecentlyActivity(req, res) {
    try {
        if (!req.query.password) {
            return res.status(400).json({ status: 'error', msg: '缺少参数' });
        }
        if (req.query.password != BOT.PASSWORD) {
            return res.status(401).json({ status: 'error', msg: '密码错误' });
        }
        const result = await sql.getMostRecentlyActivity();
        if (result == 0) {
            return res.status(404).json({ status: 'error', msg: '未找到数据' });
        }
        else if (result == -1) {
            return res.status(500).json({ status: 'error', msg: '数据库错误' });
        }
        else {
            res.status(200).json(result);
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ status: 'error', msg: '服务器未知错误' });
    }
}

async function botBindUser(req, res) {
    try {
        if (!req.query.id || !req.query.password) {
            return res.status(400).json({ status: 'error', msg: '缺少参数' });
        }
        if (req.query.password != BOT.PASSWORD) {
            return res.status(401).json({ status: 'error', msg: '密码错误' });
        }
        const result = await sql.searchUser(req.query.id);
        if (result.totalNumber == 0) {
            return res.status(404).json({ status: 'error', msg: '未找到用户' });
        }
        if (result.totalNumber > 1) {
            return res.status(409).json({ status: 'error', msg: '您输入的ID无法确定目标' });
        }
        else {
            res.status(200).json({ status: 'success', res: result.result[0].id });
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ status: 'error', msg: '服务器未知错误' });
    }
}

async function botGetUserScore(req, res) {
    try {
        if (!req.query.id || !req.query.password) {
            return res.status(400).json({ status: 'error', msg: '缺少参数' });
        }
        if (req.query.password != BOT.PASSWORD) {
            return res.status(401).json({ status: 'error', msg: '密码错误' });
        }
        const result = await sql.getUserByID(req.query.id);
        if (result === null) {
            return res.status(404).json({ status: 'error', msg: '未找到用户' });
        }
        else res.json({ status: 'success', res: result.dataValues.score });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ status: 'error', msg: '服务器未知错误' });
    }
}

module.exports = {
    botGetMostRecentlyActivity,
    botBindUser,
    botGetUserScore
}