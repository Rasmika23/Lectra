import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendInviteEmail, sendMail, setTransporter } from '../email.js';

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock transporter
    mockTransporter = {
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };

    // Explicitly inject the mock transporter
    setTransporter(mockTransporter);
  });

  describe('sendInviteEmail', () => {
    it('should send an invitation email with the correct link', async () => {
      const email = 'test@example.com';
      const inviteLink = 'http://localhost:3000/setup/token123';

      const result = await sendInviteEmail(email, inviteLink);

      expect(result.success).toBe(true);
      expect(result.data.messageId).toBe('test-message-id');
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Welcome to Lectra - Setup your Account',
          html: expect.stringContaining(inviteLink)
        })
      );
    });

    it('should return success false if sendMail fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP Error'));

      const result = await sendInviteEmail('test@example.com', 'link');

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('SMTP Error');
    });
  });

  describe('sendMail', () => {
    it('should send a generic email with custom content', async () => {
      const to = 'user@example.com';
      const subject = 'Test Subject';
      const text = 'Hello Text';
      const html = '<h1>Hello HTML</h1>';

      const result = await sendMail(to, subject, text, html);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to,
        subject,
        text,
        html
      });
    });
  });
});
