import { describe, it, expect, vi, beforeEach } from 'vitest';
import reportService from '../services/ReportService.js';

describe('ReportService', () => {
  let mockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock db
    mockDb = {
      query: vi.fn(),
    };

    // Inject the mock into the service instance
    reportService.db = mockDb;
  });

  describe('getBankDetailsReport', () => {
    it('should build the correct query with filters', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ name: 'John Doe' }] });

      const filters = { lecturerId: '123', moduleId: '456' };
      const result = await reportService.getBankDetailsReport(filters);

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('u.userid = $1'),
        [123, 456]
      );
    });
  });

  describe('getAttendanceReport', () => {
    it('should handle date range filters', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const filters = { 
        moduleId: 'all', 
        lecturerId: 'all', 
        startDate: '2023-01-01', 
        endDate: '2023-01-31' 
      };

      await reportService.getAttendanceReport(filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('s.datetime >= $1'),
        ['2023-01-01', '2023-01-31']
      );
    });
  });

  describe('exportToExcel', () => {
    it('should handle empty data without crashing', async () => {
      const buffer = await reportService.exportToExcel([], 'attendance');
      expect(buffer).toBeDefined();
    });
  });
});
