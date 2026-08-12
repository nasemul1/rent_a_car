/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/types/**', '!src/docs/**'],
  forceExit: true,
  transformIgnorePatterns: [
    'node_modules/(?!(@scalar|@scalar/express-api-reference)/)',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        rootDir: '.',
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        types: ['jest', 'node'],
      },
    }],
    '^.+\\.js$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        allowJs: true,
      },
    }],
  },
};
