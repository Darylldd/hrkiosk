const AuditLog = require('../models/AuditLog');

// Departments/roles allowed to view audit logs
const ALLOWED_ROLES  = ['hr'];
const ALLOWED_DEPTS  = ['HR', 'HRMU', 'Finance and Administrative Section (FAS)', 'admin'];

function canViewLogs(employee) {
    return ALLOWED_ROLES.includes(employee.role) ||
           ALLOWED_DEPTS.includes(employee.department);
}

exports.showLogs = (req, res) => {
    if (!canViewLogs(req.session.employee)) {
        return res.status(403).send('Access denied.');
    }

    const page   = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit  = Math.min(100, Math.max(10, parseInt(req.query.limit || '50', 10)));
    const search = (req.query.search || '').trim();

    AuditLog.findAll({ page, limit, search }, (err, data) => {
        if (err) {
            console.error('Audit log fetch error:', err);
            return res.status(500).send('Error fetching audit logs.');
        }

        const totalPages = Math.ceil(data.total / limit) || 1;

        res.render('auditLogs', {
            logs:       data.rows,
            total:      data.total,
            page,
            limit,
            totalPages,
            search,
            employee:   req.session.employee,
        });
    });
};