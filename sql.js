const { Sequelize, DataTypes, Model } = require('sequelize');
const { DB } = require('./settings.json')

const sequelize = new Sequelize(DB);

class User extends Model {}

User.init({
    userid:{
        type: DataTypes.INT,
        allowNull: false
    },
    hashedPassword:{
        type: DataTypes.STRING,
        allowNull: false
    },
    
})