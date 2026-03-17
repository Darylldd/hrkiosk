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
            data.return_date || null,
            data.destination,
            data.salary_per_diem || null,
            data.specific_purpose || null,
            data.objectives || null,
            data.per_diems_allowed || null,
            data.appropriation || null,
            data.remarks || null,
            data.office_station || null,
            data.recommending_approval || null,
            data.recommending_position || null,
            data.contact_number || null,
            data.approved_by || null,
            data.file_name,
            data.file_path,
            data.uploaded_by
        ];

        db.query(sql, params, callback);
    },

    // employeeId = null  → HR/admin: returns all records
    // employeeId = <id>  → regular employee: returns only their own records
    findAll: (search, employeeId, callback) => {
        let sql = `
            SELECT 
                t.to_no,
                MAX(t.id) as id,
                MAX(t.travel_date) as travel_date,
                MAX(t.return_date) as return_date,
                MAX(t.destination) as destination,
                MAX(t.created_at) as created_at,
                MAX(t.file_path) as file_path,
                GROUP_CONCAT(CONCAT(e.first_name,' ', IFNULL(e.middle_name,''),' ',e.last_name) SEPARATOR ', ') as employees,
                GROUP_CONCAT(e.department SEPARATOR ', ') as departments
            FROM travel_orders t
            LEFT JOIN employees e ON e.id = t.employee_id
        `;

        const params = [];
        const conditions = [];

        // Scope to the current employee when they are not HR/admin
        if (employeeId) {
            conditions.push(`t.to_no IN (
                SELECT to_no FROM travel_orders WHERE employee_id = ?
            )`);
            params.push(employeeId);
        }

        // Optional keyword search
        if (search) {
            conditions.push(`(
                t.to_no LIKE ? 
                OR t.destination LIKE ? 
                OR e.first_name LIKE ?
                OR e.last_name LIKE ?
                OR e.department LIKE ?
            )`);
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        if (conditions.length) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ` GROUP BY t.to_no ORDER BY MAX(t.id) DESC`;
        db.query(sql, params, callback);
    },

    findById: (id, callback) => {
        const sql = `
            SELECT t.*, 
                   CONCAT(e.first_name,' ', IFNULL(e.middle_name,''),' ', e.last_name) AS full_name,
                   e.position,
                   e.department
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
    }
};

module.exports = TravelOrder;