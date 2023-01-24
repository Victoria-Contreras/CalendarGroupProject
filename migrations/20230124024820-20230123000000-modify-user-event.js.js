'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'UserEvents',
      'creator',
     Sequelize.BOOLEAN
    );
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn(
      'UserEvents',
      'creator'
    );
  }
};
