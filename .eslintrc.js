// .eslintrc.js (root)
module.exports = {
  root: true,
  extends: ['@auto-bazaar-pro/eslint-config-custom'],
  settings: {
    next: {
      rootDir: ['apps/*/'],
    },
  },
};
