import { vi } from 'vitest';

export const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
export const mockTransporter = {
  sendMail: mockSendMail,
};

export const createTransport = vi.fn(() => mockTransporter);

export default {
  createTransport,
  mockSendMail,
};
