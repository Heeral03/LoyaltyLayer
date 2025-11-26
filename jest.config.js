module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/tests/**/*.spec.(ts|js)',
    '**/__tests__/**/*.(ts|js)'
  ],
  collectCoverageFrom: [
    'wrappers/**/*.(ts|js)',
    '!**/node_modules/**',
  ],
};