module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  // S125 Phase 9: __tests__/support/ holds shared test scaffolding (closeAllGroups), not suites.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/support/'],
};
