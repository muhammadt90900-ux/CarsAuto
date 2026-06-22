// .eslintrc.js (root)
module.exports = {
  root: true,
  extends: ['@cars-auto/eslint-config-custom'],
  settings: {
    next: {
      rootDir: ['apps/*/'],
    },
  },
};
