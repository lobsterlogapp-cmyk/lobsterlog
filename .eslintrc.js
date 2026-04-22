module.exports = {
  root: true,
  extends: ['@react-native'],
  rules: {
    // Warn instead of error for common things while you're learning
    'no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react/no-unstable-nested-components': 'warn',
    // Turn off ones that would be too noisy right now
    'react/react-in-jsx-scope': 'off',
    'prettier/prettier': 'off',
  },
};