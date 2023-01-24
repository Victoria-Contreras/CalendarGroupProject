'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserEvent.init({
    username: DataTypes.STRING,
    eventID: DataTypes.INTEGER,
    creator: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'UserEvent',
  });
  return UserEvent;
};