// Jest runs against a CommonJS transpile of the source (see tsconfig.jest.json), not the
// project's real ESM/NodeNext build — this sidesteps ts-jest + ESM friction entirely.
//
// tsconfig.jest.json sets `isolatedModules: true`, which puts ts-jest into transpile-only
// mode (no type information). That's required, not just a speed optimization: full
// type-checking of any file that imports @modelcontextprotocol/sdk's registerTool hits a
// known, unfixed upstream OOM in the TypeScript compiler (see the note in package.json's
// `build` script for details). Tests get type safety from `npm run typecheck` / editor
// tooling instead.
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
};
