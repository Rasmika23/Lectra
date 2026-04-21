import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Card } from '../components/Card';
import { fetchWithAuth } from '../lib/api';
import { Search, Filter, Clock, User, Activity, Globe, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogEntry {
  log_id: number;
  action_type: string;
  target_type: string;
  target_id: number | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [filterAction, setFilterAction] = useState('All');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/audit-log`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        console.error('Audit logs data is not an array:', data);
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const actionTypes = ['All', ...Array.from(new Set(Array.isArray(logs) ? logs.map(l => l.action_type) : []))].sort();

  const filteredLogs = Array.isArray(logs) ? logs.filter(log => {
    const matchesSearch = 
      (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'All' || log.action_type === filterAction;
    
    return matchesSearch && matchesAction;
  }) : [];

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return format(d, 'MMM dd, HH:mm:ss');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-red-100 text-red-700';
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-700';
    if (action === 'LOGIN') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-[var(--space-xl)] space-y-[var(--space-xl)]">
      <div>
        <h1 className="text-[var(--font-size-h1)] font-bold text-[var(--color-text-primary)]">System Audit Log</h1>
        <p className="text-[var(--color-text-secondary)] mt-[var(--space-sm)]">
          Track all administrative actions and user activities across the platform.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-[var(--space-md)]">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-disabled)]" />
            <input
              type="text"
              placeholder="Search by user, email, resource or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white capitalize"
            >
              {actionTypes.map(type => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">No logs found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-bg-sidebar)] border-b border-[#E2E8F0] text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  <th className="p-[var(--space-md)] font-semibold">Timestamp</th>
                  <th className="p-[var(--space-md)] font-semibold">User</th>
                  <th className="p-[var(--space-md)] font-semibold">Action</th>
                  <th className="p-[var(--space-md)] font-semibold">Resource</th>
                  <th className="p-[var(--space-md)] font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLogs.map(log => (
                  <React.Fragment key={log.log_id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="p-[var(--space-md)] whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[var(--font-size-small)]">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{safeFormatDate(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-[var(--space-md)]">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">{log.user_name || 'System'}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)]">{log.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-[var(--space-md)]">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionBadgeColor(log.action_type)}`}>
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-[var(--space-md)]">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="capitalize">{log.target_type} {log.target_id && `#${log.target_id}`}</span>
                        </div>
                      </td>
                      <td className="p-[var(--space-md)] text-right">
                        <button
                          onClick={() => toggleExpand(log.log_id)}
                          className="text-[var(--color-primary)] hover:bg-blue-50 p-1 rounded transition-colors"
                        >
                          {expandedLogId === log.log_id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                    {expandedLogId === log.log_id && (
                      <tr className="bg-blue-50/30">
                        <td colSpan={5} className="p-[var(--space-lg)] border-b border-[#E2E8F0]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Info className="w-3 h-3" /> Technical Details
                              </h4>
                              <div className="bg-white p-3 rounded border border-blue-100 font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Network Info
                              </h4>
                              <div className="bg-white p-3 rounded border border-blue-100 flex items-center justify-between">
                                <span className="text-sm text-gray-600 font-medium">IP Address:</span>
                                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{log.ip_address || 'Unknown'}</span>
                              </div>
                              <div className="p-3 rounded bg-blue-100/30 text-xs text-blue-700">
                                This action was performed relative to {log.target_type} ID {log.target_id || 'N/A'}.
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
