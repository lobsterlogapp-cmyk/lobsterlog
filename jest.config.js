module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  // S125 Phase 9: __tests__/support/ holds shared test scaffolding (closeAllGroups), not suites.
  // S170 Phase 5: functions/ is the Firebase Cloud Function codebase. Its suites are written
  // for Node's built-in runner (node:test), which jest cannot see — jest matched the files and
  // failed each one with "must contain at least one test". They are NOT app tests and must not
  // run here. Run them with: bash functions/scripts/parity.sh  (40/40).
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/support/', '/functions/'],
};
