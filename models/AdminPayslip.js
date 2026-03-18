const db = require('../config/db');

const AdminPayslip = {

    create: (data, callback) => {
        const sql = `
            INSERT INTO admin_payslips (
                admin_payslip_ref,
                employee_id, month, year, division, section,
                monthly_salary, pera,
                gsis_per_share, medicare, pagibig, withholding_tax,
                provident_403, gsis_emerg_337, gsis_mpl_346, hdmf_mpl_440,
                islai_premium, islai_loan, hdmf_cal, ucpb_loan,
                islai_emergency, gsis_cpl, gsis_mpl_lite, ucpb_kasama_salary,
                gsis_policy_regular, palda_capital_share, palda_coopbank_share,
                bfar_coop_additional, palda_regular,
                other_deductions,
                total_gross, total_deductions, net_pay,
                first_period, second_period
            ) VALUES (
                ?,
                ?,?,?,?,?,
                ?,?,
                ?,?,?,?,
                ?,?,?,?,
                ?,?,?,?,
                ?,?,?,?,
                ?,?,?,
                ?,?,
                ?,
                ?,?,?,
                ?,?
            )
        `;

        const params = [
            data.admin_payslip_ref,
            data.employee_id, data.month, data.year, data.division, data.section,
            data.monthly_salary, data.pera,
            data.gsis_per_share, data.medicare, data.pagibig, data.withholding_tax,
            data.provident_403, data.gsis_emerg_337, data.gsis_mpl_346, data.hdmf_mpl_440,
            data.islai_premium, data.islai_loan, data.hdmf_cal, data.ucpb_loan,
            data.islai_emergency, data.gsis_cpl, data.gsis_mpl_lite, data.ucpb_kasama_salary,
            data.gsis_policy_regular, data.palda_capital_share, data.palda_coopbank_share,
            data.bfar_coop_additional, data.palda_regular,
            JSON.stringify(data.other_deductions || []),
            data.total_gross, data.total_deductions, data.net_pay,
            data.first_period, data.second_period,
        ];

        db.query(sql, params, callback);
    },

    getAll: (callback) => {
        const sql = `
            SELECT
                ap.id,
                ap.admin_payslip_ref,
                CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                ap.month, ap.year, ap.net_pay, ap.created_at
            FROM admin_payslips ap
            LEFT JOIN employees e ON e.id = ap.employee_id
            ORDER BY ap.year DESC, ap.month DESC
        `;
        db.query(sql, callback);
    },

    // ── Look up by ref — used for view & print (no numeric DB id in URL) ──
    findByRef: (ref, callback) => {
        const sql = `
            SELECT
                ap.*,
                CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                e.position, e.account_no, e.email
            FROM admin_payslips ap
            LEFT JOIN employees e ON e.id = ap.employee_id
            WHERE ap.admin_payslip_ref = ?
            LIMIT 1
        `;
        db.query(sql, [ref], callback);
    },

    // Keep for internal use (email / delete still use numeric id)
    findById: (id, callback) => {
        const sql = `
            SELECT
                ap.*,
                CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS employee_name,
                e.position, e.account_no, e.email
            FROM admin_payslips ap
            LEFT JOIN employees e ON e.id = ap.employee_id
            WHERE ap.id = ?
        `;
        db.query(sql, [id], callback);
    },

    getByEmployeeId: (employeeId, callback) => {
        const sql = `
            SELECT id, admin_payslip_ref, month, year, net_pay
            FROM admin_payslips
            WHERE employee_id = ?
            ORDER BY year DESC, month DESC
        `;
        db.query(sql, [employeeId], callback);
    },

    deleteById: (id, callback) => {
        db.query('DELETE FROM admin_payslips WHERE id = ?', [id], callback);
    },
};

module.exports = AdminPayslip;