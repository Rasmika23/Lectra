const db = require('../db');

/**
 * AuditService handles recording of user activities for auditing purposes.
 */
class AuditService {
    /**
     * Records a log entry in the audit_log table.
     * 
     * @param {number} userId - The ID of the user performing the action.
     * @param {string} actionType - The type of action (e.g., 'LOGIN', 'CREATE', 'UPDATE', 'DELETE').
     * @param {string} targetType - The resource category (e.g., 'MODULE', 'SESSION', 'USER').
     * @param {number|null} targetId - The ID of the affected resource.
     * @param {object|null} details - Additional metadata or descriptions.
     * @param {object|null} req - The Express request object (to capture IP address).
     */
    async record(userId, actionType, targetType, targetId, details, req = null) {
        try {
            const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
            
            const query = `
                INSERT INTO audit_log (user_id, action_type, target_type, target_id, details, ip_address)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const values = [
                userId,
                actionType,
                targetType,
                targetId,
                details ? JSON.stringify(details) : null,
                ipAddress
            ];
            
            await db.query(query, values);
        } catch (err) {
            // We log the error but don't throw to avoid breaking the main request flow
            console.error('Failed to record audit log:', err);
        }
    }
}

module.exports = new AuditService();
