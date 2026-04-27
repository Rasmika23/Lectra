const vi = require('vitest').vi;

const mockPool = {
  query: vi.fn(),
  on: vi.fn(),
  end: vi.fn(),
};

module.exports = {
  Pool: vi.fn(() => mockPool),
  _mockPool: mockPool, // Export for easy access in tests
};
