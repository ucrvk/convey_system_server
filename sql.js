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
        allowNull: true,
        unique: true
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
 * @returns 0成功，1数据库未知错误，2用户ID已存在，3QQID已存在
 */
async function createUser(userid, tmpID, QQID) {
    try {
        await User.create({
            userid: userid,
            tmpID: tmpID,
            QQID: QQID
        });
        return 0; // 成功创建用户
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            // 解析错误信息以确定哪个字段引发了唯一性冲突
            const errors = error.errors;
            for (const err of errors) {
                if (err.path === 'userid') {
                    return 2; // 用户 ID 已存在
                } else if (err.path === 'QQID') {
                    return 3; // QQID 已存在
                }
            }
            return 1; // 其他唯一性冲突
        }
        return 1; // 其他类型的错误
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

/** 更新用户头像 */
async function updateAvatar(id, newAvatar) {
    try {
        await User.update({
            avatar: newAvatar
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

/** 更新用户积分 */
async function updateScore(id, addScore) {
    try {
        await User.update({
            score: addScore
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
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: true
    }
})

// 定义常量：阈值和需要删除的记录数
const AUTO_DELETE_THRESHOLD = 10; // 阈值
const AUTO_DELETE_COUNT = 5; // 删除数量

// 定义自动删除函数
async function autoDeleteOldData() {
    const transaction = await sequelize.transaction(); // 开启事务
    try {
        console.log('开始检查数据条数...');
        
        // 获取当前表中的记录总数
        const count = await Activity.count({ transaction });

        // 如果记录数超过阈值
        if (count >= AUTO_DELETE_THRESHOLD) {
            console.log(`当前记录数为 ${count}，超过阈值 ${AUTO_DELETE_THRESHOLD}，开始删除最早的 ${AUTO_DELETE_COUNT} 条记录...`);

            // 查询最早的 deleteCount 条记录的 ID
            const oldestRecords = await Activity.findAll({
                attributes: ['id'], // 只查询 id 字段
                order: [['createdAt', 'ASC']], // 按创建时间升序排列（最早的数据在前）
                limit: AUTO_DELETE_COUNT, // 限制返回的记录数
                transaction // 事务支持
            });

            // 提取记录的 ID 列表
            const idsToDelete = oldestRecords.map(record => record.id);

            // 如果没有需要删除的记录，直接返回
            if (idsToDelete.length === 0) {
                console.log('未找到需要删除的记录。');
                return;
            }

            console.log(`准备删除记录 ID 列表：${idsToDelete}`);

            // 删除这些记录
            await Activity.destroy({
                where: {
                    id: {
                        [Op.in]: idsToDelete // 使用 Op.in 操作符匹配 ID 列表
                    }
                },
                transaction // 事务支持
            });

            console.log(`成功删除了 ${idsToDelete.length} 条记录：${idsToDelete}`);
        } else {
            console.log(`当前记录数为 ${count}，未达到阈值 ${AUTO_DELETE_THRESHOLD}，无需删除。`);
        }

        // 提交事务
        await transaction.commit();
    } catch (error) {
        // 回滚事务
        await transaction.rollback();
        console.error('自动删除数据时发生错误:', error);
    }
}

// 启动定时任务，每小时运行一次
setInterval(autoDeleteOldData, 60 * 60 * 1000); // 每小时执行一次

// 手动调用一次，立即执行
autoDeleteOldData();

// 添加活动记录
async function addActivity(name, server, activityDate, startTime, endTime, meetingLocation, finalDestination, score, routeURL, parkingSpotURL, detailOneURL, detailTwoURL, fileName) {
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
            detailTwoURL: detailTwoURL, // 新增字段
            fileName: fileName // 保存文件名
        });
        return true;
    } catch (error) {
        console.error('创建活动记录时发生错误:', error);
        return false;
    }
}

async function addActivityFile(fileName) {
    try {
        // 查找最新活动的 ID
        const latestActivity = await Activity.findOne({
            order: [['id', 'DESC']] // 按 ID 降序排列，获取最新活动
        });

        if (!latestActivity) {
            console.error('未找到任何活动记录');
            return false;
        }

        // 更新最新活动的 fileName
        await Activity.update(
            { fileName: fileName }, // 更新的字段
            { where: { id: latestActivity.id } } // 更新的条件
        );

        console.log('文件名更新成功:', fileName);
        return true;
    } catch (error) {
        console.error('更新文件名时发生错误:', error);
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
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isEnable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
})


const PurchaseHistory = sequelize.define('PurchaseHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    goodsId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    orderId: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'purchase_histories',
    timestamps: false // 如果不需要 createdAt 和 updatedAt 字段
})

// 定义关联关系
PurchaseHistory.associate = function (models) {
    PurchaseHistory.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
    PurchaseHistory.belongsTo(models.Shop, { foreignKey: 'goodsId', as: 'Goods' });
}

async function createItem(name, description, quantity, price, image) {
    try {
        await Shop.create({
            name: name,
            description: description,
            quantity: quantity,
            price: price,
            image: image
        })
        return true;
    }
    catch (error) {
        console.error(error)
        return false
    }
}
// 删除商品（支持批量）
async function dropItem(id) {
    try {
        const result = await Shop.destroy({
            where: {
                id: id // 匹配指定的商品ID
            }
        });
        return result > 0; // 返回true表示删除成功，false表示商品不存在或删除失败
    } catch (error) {
        console.error('删除单个商品错误:', error);
        return false; // 发生错误时返回false
    }
}

async function dropItems(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
        console.error('无效的商品ID数组');
        return false; // 如果ids不是数组或为空，直接返回false
    }

    try {
        const result = await Shop.destroy({
            where: {
                id: {
                    [Op.in]: ids // 使用 Op.in 操作符匹配数组中的值
                }
            }
        });
        return result > 0; // 返回true表示删除成功，false表示没有符合条件的商品或删除失败
    } catch (error) {
        console.error('批量删除商品错误:', error);
        return false; // 发生错误时返回false
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
 * 智能搜索商品，同时搜索name, id, description
 * @param {*} searchID 可选项，有值时搜索所有name中有一个满足的商品，无值时返回所有商品
 * @param {*} page 可选项，有值时会按10个一页输出
 * @returns {Promise<Shop[]>} 返回商品数组
 */
async function searchShop(searchID, page) {
    const pageSize = 10;
    let totalNumber;
    let result;

    if (!searchID) {
        totalNumber = await Shop.count();
        let options = {};
        // 仅在 page 有效时应用分页
        if (typeof page === 'number' && page > 0) {
            options.offset = (page - 1) * pageSize;
            options.limit = pageSize;
        }
        result = await Shop.findAll(options);
    } else {
        // 构建查询条件
        const whereCondition = {
            [Op.or]: [
                { name: { [Op.like]: `%${searchID}%` } },
                { id: { [Op.eq]: searchID } },
                { description: { [Op.like]: `%${searchID}%` } }
            ]
        };
        
        totalNumber = await Shop.count({ where: whereCondition });
        result = await Shop.findAll({
            where: whereCondition,
            offset: (page - 1) * pageSize,
            limit: pageSize
        });
    }

    // 返回结果
    if (typeof page === 'number' && page > 0) {
        return { totalNumber, totalPage: Math.ceil(totalNumber / pageSize), result };
    }
    return { totalNumber, result };
}

/**
 * 异步获取商品信息
 * @returns {Promise<Array|number>} 正确返回商品数组，数据库错误返回-1
 */
async function getShopInfo() {
    try {
        // 查找所有商品记录
        const res = await Shop.findAll();

        if (!res || res.length === 0) {
            console.log('未找到任何商品记录');
            return []; // 返回空数组表示没有商品
        }

        return res;
    } catch (error) {
        console.error('获取商品信息时发生错误:', error);
        return -1;
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
        // 查找用户和商品信息
        const user = await User.findByPk(ID, { transaction });
        const goods = await Shop.findByPk(goodsID, { transaction });

        if (!user || !goods) {
            await transaction.rollback();
            return -1; // 用户或商品不存在
        }

        // 检查用户积分是否足够
        if (user.score < goods.price) {
            await transaction.rollback();
            return 1; // 积分不足
        }

        // 更新用户积分
        user.score -= goods.price;
        await user.save({ transaction });

        // 更新商品库存
        if (goods.quantity > 0) {
            goods.quantity -= 1;
            await goods.save({ transaction });
        } else {
            await transaction.rollback();
            return -1; // 商品库存不足
        }

        // 记录购买历史
        const orderId = generateOrderId(); // 生成订单号（你可以根据业务需求自定义）
        await PurchaseHistory.create({
            userId: ID,
            goodsId: goodsID,
            purchaseDate: new Date(),
            orderId: orderId
        }, { transaction });

        // 提交事务
        await transaction.commit();

        return 0; // 购买成功
    } catch (error) {
        console.error('购买商品时发生错误:', error);
        await transaction.rollback();
        return -1; // 服务器原因失败
    }
}

// 辅助函数：生成订单号（示例）
function generateOrderId() {
    return 'ORD' + Math.random().toString(36).substr(2, 9); // 示例生成随机订单号
}

/**
 * 获取用户的购买历史
 * @async 
 * @param {number} userID 用户的id
 * @returns {Promise<Array|number>} 正确返回购买历史数组，数据库错误返回-1
 */
async function getUserPurchaseHistory(userID) {
    try {
        const purchaseHistories = await PurchaseHistory.findAll({
            where: { userId: userID },
            include: [
                {
                    model: Shop, // 包含商品信息
                    as: 'Goods', // 确保你在 PurchaseHistory 模型中有相应的关联
                    attributes: ['name', 'description', 'price']
                }
            ],
            order: [['purchaseDate', 'DESC']] // 按购买日期降序排列
        });

        if (!purchaseHistories || purchaseHistories.length === 0) {
            console.log('未找到任何购买记录');
            return []; // 返回空数组表示没有购买记录
        }

        return purchaseHistories;
    } catch (error) {
        console.error('获取购买历史时发生错误:', error);
        return -1;
    }
}

// 初始化关联
User.hasMany(PurchaseHistory, { foreignKey: 'userId', as: 'PurchaseHistories' });
PurchaseHistory.belongsTo(User, { foreignKey: 'userId', as: 'User' });

Shop.hasMany(PurchaseHistory, { foreignKey: 'goodsId', as: 'PurchaseHistories' });
PurchaseHistory.belongsTo(Shop, { foreignKey: 'goodsId', as: 'Goods' });

module.exports = {
    User,
    createUser,
    createItem,
    dropItem,
    dropItems,
    changeItemAccessibility,
    getUserByID,
    superUserAutoUpdate,
    updateUser,
    updateAvatar,
    updatePassword,
    updateScore,
    dropUser,
    dropUsers,
    userPermissionChange,
    userPasswordExamine,
    searchUser,
    searchShop,
    getMostRecentlyActivity,
    userPermissionChange,
    addActivity,
    addActivityFile,
    getShopInfo,
    purchaseItem,
    getUserPurchaseHistory
}