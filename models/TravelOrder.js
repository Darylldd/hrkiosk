const db = require('../config/db');

const TravelOrder = {

    create: (data, callback) => {
        const sql = `INSERT INTO travel_orders
            (
                employee_id, to_no, travel_date, return_date, destination,
                salary_per_diem, specific_purpose, objectives,
                per_diems_allowed, appropriation, remarks,
                office_station, recommending_approval, recommending_position,
                contact_number, approved_by, file_name, file_path, uploaded_by
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

        const params = [
            data.employee_id,
            data.to_no,
            data.travel_date,
            data.return_date             || null,
            data.destination,
            data.salary_per_diem         || null,
            data.specific_purpose        || null,
            data.objectives              || null,
            data.per_diems_allowed       || null,
            data.appropriation           || null,
            data.remarks                 || null,
            data.office_station          || null,
            data.recommending_approval   || null,
            data.recommending_position   || null,
            data.contact_number          || null,
            data.approved_by             || null,
            data.file_name,
            data.file_path,
            data.uploaded_by,
        ];

        db.query(sql, params, callback);
    },

    // employeeId = null  → HR/admin: returns all records
    // employeeId = <id>  → regular employee: returns only their own records
    findAll: (search, employeeId, callback) => {
        let sql = `
            SELECT
                t.to_no,
                MAX(t.id)         AS id,
                MAX(t.travel_date) AS travel_date,
                MAX(t.return_date) AS return_date,
                MAX(t.destination) AS destination,
                MAX(t.created_at)  AS created_at,
                MAX(t.file_path)   AS file_path,
                GROUP_CONCAT(
                    CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name)
                    SEPARATOR ', '
                ) AS employees,
                GROUP_CONCAT(e.department SEPARATOR ', ') AS departments
            FROM travel_orders t
            LEFT JOIN employees e ON e.id = t.employee_id
        `;

        const params      = [];
        const conditions  = [];

        if (employeeId) {
            conditions.push(`t.to_no IN (
                SELECT to_no FROM travel_orders WHERE employee_id = ?
            )`);
            params.push(employeeId);
        }

        if (search) {
            conditions.push(`(
                t.to_no       LIKE ?
                OR t.destination LIKE ?
                OR e.first_name  LIKE ?
                OR e.last_name   LIKE ?
                OR e.department  LIKE ?
            )`);
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

        sql += ` GROUP BY t.to_no ORDER BY MAX(t.id) DESC`;
        db.query(sql, params, callback);
    },

    findById: (id, callback) => {
        const sql = `
            SELECT t.*,
                   CONCAT(e.first_name, ' ', IFNULL(e.middle_name, ''), ' ', e.last_name) AS full_name,
                   e.position, e.department
            FROM travel_orders t
            LEFT JOIN employees e ON e.id = t.employee_id
            WHERE t.id = ?
        `;
        db.query(sql, [id], callback);
    },

    findByToId: (id, callback) => {
        const sql = `
            SELECT t.*,
                   e.id AS employee_id,
                   CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                   e.department, e.position
            FROM travel_orders t
            LEFT JOIN employees e ON e.id = t.employee_id
            WHERE t.id = ? OR t.to_no = (SELECT to_no FROM travel_orders WHERE id = ?)
            ORDER BY t.id
        `;
        db.query(sql, [id, id], callback);
    },

    // ── Look up all rows sharing a to_no — used for print (no DB id in URL) ──
    // employeeId = null  → HR/admin: unrestricted
    // employeeId = <id>  → regular employee: only allowed if they are on that TO
    findByToNo: (toNo, employeeId, callback) => {
        // First verify access: if employeeId is given, confirm they appear on this TO
        let accessSql;
        let accessParams;

        if (employeeId) {
            accessSql    = `SELECT COUNT(*) AS cnt FROM travel_orders
                            WHERE to_no = ? AND employee_id = ?`;
            accessParams = [toNo, employeeId];
        } else {
            // HR/admin — always allowed
            accessSql    = `SELECT 1 AS cnt`;
            accessParams = [];
        }

        db.query(accessSql, accessParams, (err, rows) => {
            if (err) return callback(err);

            // For non-privileged users, deny if they're not on the TO
            if (employeeId && (!rows[0] || rows[0].cnt === 0)) {
                return callback(null, []); // empty = 404 in the controller
            }

            // Fetch all rows for this TO
            const sql = `
                SELECT t.*,
                       e.id AS employee_id,
                       CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                       e.department, e.position
                FROM travel_orders t
                LEFT JOIN employees e ON e.id = t.employee_id
                WHERE t.to_no = ?
                ORDER BY t.id
            `;
            db.query(sql, [toNo], callback);
        });
    },
};

module.exports = TravelOrder;