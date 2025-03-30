const axios = require('axios');

async function getPlayer(axiosInstance, tmpId) {
    try {
        const url = `https://api.truckersmp.com/v2/player/${tmpId}`;
        console.log(`发送请求到: ${url}`); // 增加日志输出
        
        const response = await axiosInstance.get(url);
        return { error: false, data: response.data };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`查询玩家信息失败: 玩家ID ${tmpId} 未找到`);
            return { error: true, message: '玩家ID未找到' };
        } else {
            console.error(`查询玩家信息失败: ${error.message}`);
            console.error(`错误详情: ${JSON.stringify(error.response ? error.response.data : '无响应数据')}`);
            return { error: true, message: '查询玩家信息失败' };
        }
    }
}

async function getServers(axiosInstance) {
    try {
        const response = await axiosInstance.get('https://api.truckersmp.com/v2/servers');
        return { error: false, data: response.data };
    } catch (error) {
        console.error(`查询服务器列表失败: ${error.message}`);
        return { error: true, message: '查询服务器列表失败' };
    }
}

async function getBans(axiosInstance, tmpId) {
    try {
        const response = await axiosInstance.get(`https://api.truckersmp.com/v2/bans/${tmpId}`);
        return { error: false, data: response.data };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`查询玩家封禁信息失败: 玩家ID ${tmpId} 未找到`);
            return { error: true, message: '玩家ID未找到' };
        } else {
            console.error(`查询玩家封禁信息失败: ${error.message}`);
            return { error: true, message: '查询玩家封禁信息失败' };
        }
    }
}

async function getVersion(axiosInstance) {
    try {
        const response = await axiosInstance.get('https://api.truckersmp.com/v2/version');
        return { error: false, data: response.data };
    } catch (error) {
        console.error(`查询游戏版本失败: ${error.message}`);
        return { error: true, message: '查询游戏版本失败' };
    }
}

async function getVtcMember(axiosInstance, vtcId, memberId) {
    try {
        const response = await axiosInstance.get(`https://api.truckersmp.com/v2/vtc/${vtcId}/member/${memberId}`);
        return { error: false, data: response.data };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`查询车队成员信息失败: 车队ID ${vtcId} 或成员ID ${memberId} 未找到`);
            return { error: true, message: '车队ID或成员ID未找到' };
        } else {
            console.error(`查询车队成员信息失败: ${error.message}`);
            return { error: true, message: '查询车队成员信息失败' };
        }
    }
}

async function getGameTime(axiosInstance) {
    try {
        // 请求游戏时间
        const response = await axiosInstance.get('https://api.truckersmp.com/v2/game_time');
        if (!response.data.error) {
            return { error: false, game_time: response.data.game_time };
        } else {
            console.error(`查询游戏时间失败: API响应错误`);
            return { error: true, message: 'API响应错误' };
        }
    } catch (error) {
        // 捕获请求过程中发生的错误
        console.error(`查询游戏时间失败: ${error.message}`);
        return { error: true, message: '查询游戏时间失败' };
    }
}

module.exports = {
    getPlayer,
    getServers,
    getBans,
    getVersion,
    getVtcMember,
    getGameTime
}