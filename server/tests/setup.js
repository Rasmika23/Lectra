import { vi } from 'vitest';

// Set up dummy environment variables for tests
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_USER = 'user';
process.env.SMTP_PASS = 'pass';
process.env.DB_USER = 'user';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'db';
process.env.DB_PASSWORD = 'password';
process.env.DB_PORT = '5432';

// Global mock for path to avoid issues with __dirname in ESM tests if needed
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual };
});
