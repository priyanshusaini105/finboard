require('@testing-library/jest-dom');

// Store original Date for use in tests
const OriginalDate = global.Date;

// Only mock Date.now if needed, preserve Date object itself
// This allows Date.parse to work while still having a consistent test time
const mockNow = new Date('2024-01-01T12:00:00Z').getTime();
OriginalDate.now = jest.fn(() => mockNow);
