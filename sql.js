const { Sequelize, DataTypes } = require('sequelize');
const { DB, SU } = require('./settings.json');
const { encryptPassword } = require('./secure')
const sequelize = new Sequelize(DB);

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

module.exports = {
    createUser,
    superUserAutoUpdate
}