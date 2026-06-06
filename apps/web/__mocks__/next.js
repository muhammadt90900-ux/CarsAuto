// apps/web/__mocks__/next.js
module.exports = {
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
  notFound: jest.fn(),
};
