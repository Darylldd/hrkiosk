const db = require('../config/db');

const Payslip = {

    create: (data, callback) => {
        const sql = `
            INSERT INTO payslips
                (payslip_ref, employee_id, month, cutoff, basic_pay,
                 late_absences, pagibig_mp1, pagibig_mp2,
                 pagibig_mpl, pagibig_calamity, sss,
                 philhealth, tax, disallowances,
                 totalDeductions, netPay)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `;

        const params = [
            data.payslip_ref,
            data.employee_id,
            data.month,
            data.cutoff,
            data.basic_pay,
            data.late_absences,
            data.pagibig_mp1,
            data.pagibig_mp2,
            data.pagibig_mpl,
            data.pagibig_calamity,
            data.sss,
            data.philhealth,
            data.tax,
            data.disallowances,
            data.totalDeductions,
            data.netPay,
        ];

        db.query(sql, params, callback);
    },

    getAll: (callback) => {
        const sql = `
            SELECT
                p.id,
                p.payslip_ref,
                CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                p.month,
                p.cutoff
            FROM payslips p
            LEFT JOIN employees e ON e.id = p.employee_id
            ORDER BY p.month DESC, p.id DESC
        `;
        db.query(sql, callback);
    },

    // Look up by the human-readable ref (no numeric DB id in URL)
    findByRef: (payslip_ref, callback) => {
        const sql = `
            SELECT
                p.*,
                CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                e.account_no,
                e.email,
                e.employee_no
            FROM payslips p
            LEFT JOIN employees e ON e.id = p.employee_id
            WHERE p.payslip_ref = ?
            LIMIT 1
        `;
        db.query(sql, [payslip_ref], callback);
    },

    // Keep for internal use (email send still uses numeric id via session lookup)
    findById: (id, callback) => {
        const sql = `
            SELECT
                p.*,
                CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                e.account_no,
                e.email,
                e.employee_no
            FROM payslips p
            LEFT JOIN employees e ON e.id = p.employee_id
            WHERE p.id = ?
        `;
        db.query(sql, [id], callback);
    },

    getByEmployeeId: (employeeId, callback) => {
        const sql = `
            SELECT payslip_ref, month, cutoff
            FROM payslips
            WHERE employee_id = ?
            ORDER BY month DESC, id DESC
        `;
        db.query(sql, [employeeId], callback);
    },
};

module.exports = Payslip;