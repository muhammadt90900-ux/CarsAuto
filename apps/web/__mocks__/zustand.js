// apps/web/__mocks__/zustand.js
// Minimal zustand mock for unit tests that import the store module
const { create } = jest.requireActual('zustand');
module.exports = { create, persist: (fn) => fn };
