const { Sequelize, DataTypes, Op } = require('sequelize');
const { DB, SU } = require('./settings.json');
const { encryptPassword } = require('./secure')
const sequelize = new Sequelize(DB);
const os = require('os')


const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    userid: {
        type: DataTypes.STRING, // 使用字符串类型以支持任意长度
        allowNull: false,
        unique: true,
        get() {
            const rawValue = this.getDataValue('userid');
            return rawValue !== undefined && rawValue !== null ? rawValue.padStart(3, '0') : ''; // 处理 undefined 和 null
        },
        set(value) {
            if (typeof value === 'number') {
                value = value.toString().padStart(3, '0'); // 转换为字符串并添加前导零
            }
            this.setDataValue('userid', value);
        }
    },
    hashedPassword: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "1368c6bd8da6299d880dbef46b2c1a4aff68fd21ccc301dbbcf24dd9297094b9" // 密码：XY-123456
    },
    tmpID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    QQID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    userPermissionLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    adminRole: {
        type: DataTypes.STRING, // 添加管理职位字段
        allowNull: true,
        defaultValue: "俱乐部成员"
    },
    isEnable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    avatar: {
        type: DataTypes.STRING, // 头像地址
        allowNull: true,
        defaultValue: "https://i.postimg.cc/3xkKhVP1/avatar.png"
    }
}, {
    timestamps: true
});

/**
 * 异步创建用户
 * @param {number} userid 用户id
 * @param {number} tmpID tmpID
 * @param {number} QQID QQ号
 * @returns 0成功，1数据库未知错误，2用户已存在
 */
async function createUser(userid, tmpID, QQID) {
    try {
        await User.create({
            userid: userid,
            tmpID: tmpID,
            QQID: QQID
        })
        return 0
    }
    catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) return 2
        return 1
    }
}
/** 数据库初始化和超级用户注册*/
async function superUserAutoUpdate() {
    await sequelize.sync()
    await User.upsert({
        id: 1,
        userid: SU.USERID,
        hashedPassword: encryptPassword(SU.PASSWORD),
        QQID: SU.QQID,
        userPermissionLevel: 0b1111,
        adminRole: "技术团队副主管"
    })
}

async function getUserByID(id) {
    return await User.findByPk(id);
}

/** 异步更新用户信息，操作用户密码，权限，积分需要使用专门函数 */
async function updateUser(id, updateData) {
    try {
        const result = await User.update(updateData, {
            where: {
                id: id
            }
        });

        // 检查更新是否成功
        if (result && result[0] > 0) {
            return true;
        } else {
            console.log('No rows were updated');
            return false;
        }
    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
}

/** 更新用户密码，注意权限验证不在这里 */
async function updatePassword(id, password) {
    try {
        await User.update({
            hashedPassword: encryptPassword(password)
        }, {
            where: {
                id: id
            }
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}
/** 操作用户分数，注意change是分数变化值 */
async function updateScore(id, change) {
    try {
        await User.update({
            score: sequelize.literal(`score + ${change}`),
        }, {
            where: {
                id: id
            }
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}

async function userPermissionChange(id, permissionLevel) {
    try {
        await User.update({
            userPermissionLevel: permissionLevel
        }, {
            where: {
                id: id
            }
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}

async function dropUser(id) {
    try {
        await User.destroy({
            where: {
                id: id
            }
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}

async function dropUsers(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
        return false;
    }

    try {
        const result = await User.destroy({
            where: {
                id: {
                    [Op.in]: ids // 使用 Op.in 操作符来匹配数组中的值
                }
            }
        });
        return result > 0; // 返回是否删除成功
    } catch (error) {
        console.error("Error deleting users:", error);
        return false;
    }
}

/**
 * 智能搜索目标，同时搜索userid,tmpid,qqid
 * @param {*} searchID 可选项，有值时搜索所有userid,tmpid,qqid中有一个满足的用户，无值时返回所有用户
 * @param {*} page 可选项，有值时会按10个一页输出
 * @returns {Promise<User[]>} 返回用户数组
 */
async function searchUser(searchID, page) {
    const pageSize = 10;
    let totalNumber;
    let result;

    if (!searchID) {
        totalNumber = await User.count();
        let options = {};
        // 仅在 page 有效时应用分页
        if (typeof page !== 'undefined' && !isNaN(page)) {
            options.offset = (page - 1) * pageSize;
            options.limit = pageSize;
        }
        result = await User.findAll(options);
    } else {
        // 原有处理 searchID 的代码保持不变
        totalNumber = await User.count({
            where: {
                [Op.or]: [
                { userid: searchID },
                { tmpID: searchID },
                { QQID: searchID }
            ]
            }
        });
        result = await User.findAll({
            where: {
                [Op.or]: [
                { userid: searchID },
                { tmpID: searchID },
                { QQID: searchID }
            ]
            },
            offset: (page - 1) * pageSize,
            limit: pageSize
        });
    }

    // 返回结果
    if (typeof page !== 'undefined' && !isNaN(page)) {
        return { totalNumber, totalPage: Math.ceil(totalNumber / pageSize), result };
    }
    return { totalNumber, result };
}

/**
 * @async
 * @param {Object} loginInfo - 登录信息对象，包含 userid 或 QQID 和 password
 * @param {number} [loginInfo.userid] - 用户id
 * @param {string} [loginInfo.QQID] - 用户的QQID
 * @param {string} loginInfo.password - 密码由客户端加密，而非服务端
 * @returns {Promise<number>} 正确返回id，错误返回0，用户被禁用返回-1，数据库错误返回-2
 */
async function userPasswordExamine(loginInfo) {
    const { userid, QQID, password } = loginInfo;

    if (!userid && !QQID) {
        return -3; // 表示没有提供有效的登录凭证
    }

    try {
        let user;
        if (userid) {
            user = await User.findOne({
                where: {
                    userid: userid
                }
            });
        } else if (QQID) {
            user = await User.findOne({
                where: {
                    QQID: QQID
                }
            });
        }

        if (user == null) return 0; // 用户不存在
        if (user.hashedPassword !== password) return 0; // 密码不匹配
        if (!user.isEnable) return -1; // 用户被禁用

        return user.id; // 返回用户ID
    } catch (error) {
        console.error(error);
        return -2; // 数据库错误
    }
}

//活动相关
const Activity = sequelize.define('Activity', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "某活动"
    },
    server: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activityDate: {
        type: DataTypes.DATEONLY, // 仅包含日期（年-月-日）
        allowNull: false
    },
    startTime: {
        type: DataTypes.TIME, // 仅包含时间（时:分:秒）
        allowNull: false
    },
    endTime: {
        type: DataTypes.TIME, // 仅包含时间（时:分:秒）
        allowNull: false
    },
    meetingLocation: {
        type: DataTypes.STRING, // 集合地点
        allowNull: true
    },
    finalDestination: {
        type: DataTypes.STRING, // 最终终点
        allowNull: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isEnable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    usedDLCS: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '["dlc_balkan_w.scs","dlc_feldbinder.scs","dlc_krone.scs","dlc_iberia.scs","dlc_north.scs","dlc_balt.scs","dlc_fr.scs","dlc_it.scs","dlc_east.scs","dlc_balkan_e.scs","dlc_greece.scs"]'
    },
    routeURL: { // 新增的路线 URL 字段
        type: DataTypes.STRING,
        allowNull: true
    },
    parkingSpotURL: { // 新增的车位 URL 字段
        type: DataTypes.STRING,
        allowNull: true
    },
    detailOneURL: { // 新增的细节一 URL 字段
        type: DataTypes.STRING,
        allowNull: true
    },
    detailTwoURL: { // 新增的细节二 URL 字段
        type: DataTypes.STRING,
        allowNull: true
    }
})

async function addActivity(name, server, activityDate, startTime, endTime, meetingLocation, finalDestination, score, routeURL, parkingSpotURL, detailOneURL, detailTwoURL) {
    try {
        // 去掉时间中的秒部分
        function removeSeconds(time) {
            const [hours, minutes] = time.split(':').slice(0, 2);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }

        // 处理时间和日期
        startTime = removeSeconds(startTime);
        endTime = removeSeconds(endTime);

        // 创建活动记录
        await Activity.create({
            name: name,
            server: server,
            activityDate: activityDate, // 新增字段
            startTime: startTime, // 已去除秒的部分
            endTime: endTime, // 已去除秒的部分
            meetingLocation: meetingLocation, // 新增字段
            finalDestination: finalDestination, // 新增字段
            score: score,
            isEnable: true, // 默认值为true
            routeURL: routeURL, // 新增字段
            parkingSpotURL: parkingSpotURL, // 新增字段
            detailOneURL: detailOneURL, // 新增字段
            detailTwoURL: detailTwoURL // 新增字段
        });
        return true;
    } catch (error) {
        console.error('创建活动记录时发生错误:', error);
        return false;
    }
}


/**
 * 异步获取当天的最近活动项目
 * @returns {Promise<Activity|number>} 正确返回活动对象，没有活动返回0，数据库错误返回-1
 */
async function getMostRecentlyActivity() {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // 查找当天的最近活动记录，按 id 降序排列并取第一条记录
        const res = await Activity.findOne({
            where: {
                activityDate: {
                    [Op.between]: [startOfDay, endOfDay]  // 活动日期在当天范围内
                }
            },
            order: [
                ['id', 'DESC']  // 按 id 降序排列
            ]
        });

        if (!res) {
            console.log('未找到符合条件的活动记录');
            return 0;
        }

        return res;
    } catch (error) {
        console.error('获取最近活动时发生错误:', error);
        return -1;
    }
}

//积分统计相关
const ActivityParticipation = sequelize.define('ActivityParticipation', {
    user: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
})

async function startRecord(id) {
    try {
        await ActivityParticipation.upsert({
            user: id,
            startTime: new Date()
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}
async function adminEndRecord(date) {
    try {
        const now = new Date();
        const usersBeforeDate = await ActivityParticipation.findAll({
            attributes: ['userId'],  // 只查询 userId
            where: {
                startTime: {
                    [Op.lt]: now,  // 查找 startTime 小于给定日期的记录
                },
            },
        });
        const user = usersBeforeDate.map(record => record.user);
        ActivityParticipation.destroy({ where: {}, });
        return user;
    }
    catch (error) {
        console.error(error)
        return false
    }
}
async function endRecord(id) {
    try {
        await ActivityParticipation.destroy({ where: { user: id } });
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}

//积分商店
const Shop = sequelize.define('Shop', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "某商品"
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    isEnable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
})
//积分历史
const ScoreHistory = sequelize.define('scoreHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    operator: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    target: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
})

async function createItem(name, description, quantity, price) {
    try {
        await Shop.create({
            name: name,
            description: description,
            quantity: quantity,
            price: price
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}
async function dropItem(id) {
    try {
        await Shop.destroy({ where: { id: id } });
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}

async function changeItemAccessibility(id, able) {
    try {
        await Shop.update({ isEnable: able }, { where: { id: id } });
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}

/**
 * 操作用户购买物品流程
 * @async 
 * @param {number} goodsID  商品id
 * @param {number} ID 用户的id，不是用户名
 * @returns {Promise<1|0|-1>} 1代表积分不足，0代表购买成功，-1代表服务器原因失败
 */
async function purchaseItem(goodsID, ID) {
    const transaction = await sequelize.transaction();
    try {
        const user = await User.findByPk(ID, { transaction });
        const goods = await Shop.findByPk(goodsID, { transaction });
        if (user.score < goods.price) {
            return 1;
        }
        //todo 购买物品
    }
    catch (error) {
        console.error(error)
        return false
    }
}
module.exports = {
    User,
    createUser,
    getUserByID,
    superUserAutoUpdate,
    updateUser,
    updatePassword,
    updateScore,
    dropUser,
    dropUsers,
    userPermissionChange,
    userPasswordExamine,
    searchUser,
    getMostRecentlyActivity,
    userPermissionChange,
    addActivity,
}