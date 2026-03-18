const db = require('../config/db');

const AuditLog = {

    log: ({ employee_id, employee_name, action, details, ip_address }, callback = () => {}) => {
        const sql = `
            INSERT INTO audit_logs (employee_id, employee_name, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(sql, [
            employee_id  || null,
            employee_name || 'System',
            action,
            typeof details === 'object' ? JSON.stringify(details) : (details || null),
            ip_address   || null,
        ], callback);
    },

    // Fetch all logs — paginated + optional search
    findAll: ({ page = 1, limit = 50, search = '' } = {}, callback) => {
        const offset = (page - 1) * limit;
        const like   = `%${search}%`;

        const countSql = `
            SELECT COUNT(*) AS total FROM audit_logs
            WHERE ? = ''
               OR employee_name LIKE ?
               OR action        LIKE ?
               OR details       LIKE ?
               OR ip_address    LIKE ?
        `;
        db.query(countSql, [search, like, like, like, like], (err, countResult) => {
            if (err) return callback(err);

            const total = countResult[0].total;

            const dataSql = `
                SELECT * FROM audit_logs
                WHERE ? = ''
                   OR employee_name LIKE ?
                   OR action        LIKE ?
                   OR details       LIKE ?
                   OR ip_address    LIKE ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            `;
            db.query(dataSql, [search, like, like, like, like, limit, offset], (err2, rows) => {
                if (err2) return callback(err2);
                callback(null, { rows, total, page, limit });
            });
        });
    },

};

module.exports = AuditLog;