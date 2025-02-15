const { Sequelize, DataTypes, Op } = require('sequelize');
const { DB, SU } = require('./settings.json');
const { encryptPassword } = require('./secure')
const sequelize = new Sequelize(DB);
const os = require('os')

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    hashedPassword: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"//123456
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
    isEnable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
        userPermissionLevel: 0b1111
    })
}

async function getUserByID(id) {
    return await User.findByPk(id);
}

/** 异步更新用户信息，操作用户密码，权限，积分需要使用专门函数 */
async function updateUser(id, userid, tmpID, QQID, isEnable) {
    try {
        await User.update({
            userid: userid,
            tmpID: tmpID,
            QQID: QQID,
            isEnable: isEnable
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
/**
 * 智能搜索目标，同时搜索userid,tmpid,qqid
 * @param {*} searchID 可选项，有值时搜索所有userid,tmpid,qqid中有一个满足的用户，无值时返回所有用户
 * @param {*} page 可选项，有值时会按10个一页输出
 * @returns {Promise<User[]>} 返回用户数组
 */
async function searchUser(searchID, page) {
    const pageSize = 10
    let totalNumber;
    let result;
    if (!searchID) {
        totalNumber = await User.count()
        result = await User.findAll({
            offset: (page - 1) * pageSize,
            limit: pageSize
        })
    }
    else {
        totalNumber = await User.count({
            where: {
                [Op.or]: [
                    { userid: searchID },
                    { tmpID: searchID },
                    { QQID: searchID }
                ]
            }
        })
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
        })
    }
    if (page) return { 'totalNumber': totalNumber, 'totalPage': Math.ceil(totalNumber / pageSize), 'result': result };
    return { "totalNumber": totalNumber, "result": result }
}

/**
 * @async
 * @param {number} userid 用户id是用户id，不是id
 * @param {string} password 密码由客户端加密，而非服务端
 * @returns {Promise<number>} 正确返回id，错误返回0，用户被禁用返回-1，数据库错误返回-2
 */
async function userPasswordExamine(userid, password) {
    try {
        const user = await User.findOne({
            where: {
                userid: userid
            }
        })
        if (user == null) return 0
        if (user.hashedPassword == password) {
            if (user.isEnable == false) return -1
            return user.id
        }
        return 0
    }
    catch (error) {
        console.error(error)
        return -2
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
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false
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
    }
})

async function addActivity(name, server, startTime, endTime, score) {
    try {
        await Activity.create({
            name: name,
            server: server,
            startTime: startTime,
            endTime: endTime,
            score: score,
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}


/**
 * 异步获取最近活动项目
 * @returns {Promise<Activity|0|-1>} 正确返回活动对象，没有活动返回0，数据库错误返回-1
 */
async function getMostRecentlyActivity() {
    try {
        let now = new Date();
        let res = await Activity.findOne({
            where: {
                endtime: {
                    [Op.gt]: now
                }
            },
            order: [
                ['endTime', 'ASC']
            ]
        })
        if (res == null) return 0;
        return res;
    }
    catch (error) {
        console.error(error)
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
    createUser,
    getUserByID,
    superUserAutoUpdate,
    updateUser,
    updatePassword,
    updateScore,
    dropUser,
    userPermissionChange,
    userPasswordExamine,
    getMostRecentlyActivity,
    userPermissionChange,
    userPasswordExamine,
    getMostRecentlyActivity,
    addActivity,
}