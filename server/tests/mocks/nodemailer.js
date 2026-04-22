const vi = require('vitest').vi;

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
const mockTransporter = {
  sendMail: mockSendMail,
};

module.exports = {
  createTransport: vi.fn(() => mockTransporter),
  _mockSendMail: mockSendMail, // Export for easy access in tests
};
