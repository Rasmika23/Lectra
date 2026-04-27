import { vi } from 'vitest';

export const query = vi.fn().mockResolvedValue({ rows: [] });
export const setPool = vi.fn();

export default {
  query,
  setPool,
};
