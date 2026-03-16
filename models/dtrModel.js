const db = require('../config/db');

const DTR = {
    getByUser: (userId, callback) => {
        const sql = "SELECT * FROM dtr WHERE employee_id = ? ORDER BY date DESC";
        db.query(sql, [userId], callback);
    },

    getToday: (userId, callback) => {
        const sql = "SELECT * FROM dtr WHERE employee_id = ? AND date = CURDATE() LIMIT 1";
        db.query(sql, [userId], callback);
    },

    getWeek: (userId, callback) => {
        const sql = `
            SELECT * FROM dtr 
            WHERE employee_id = ? 
            AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
            ORDER BY date ASC
        `;
        db.query(sql, [userId], callback);
    },

    clockIn: (userId, callback) => {
        const sql = "INSERT INTO dtr (employee_id, time_in, date) VALUES (?, NOW(), CURDATE())";
        db.query(sql, [userId], callback);
    },

    clockOut: (userId, callback) => {
        const sql = "UPDATE dtr SET time_out = NOW() WHERE employee_id = ? AND date = CURDATE()";
        db.query(sql, [userId], callback);
    },
getAllUsersWeek: (callback) => {
    const sql = `
        SELECT 
            e.id AS employee_id,
            e.first_name,
            e.last_name,
            e.email,
            e.department,
            d.date,
            d.time_in,
            d.time_out
        FROM employees e
        LEFT JOIN dtr d
            ON e.id = d.employee_id
            AND YEARWEEK(d.date, 1) = YEARWEEK(CURDATE(), 1)
        ORDER BY e.first_name, e.last_name, d.date ASC
    `;

    db.query(sql, callback);
},
getAllUsersFiltered: (year, month, callback) => {
    let sql = `
        SELECT 
            e.id AS employee_id,
            e.first_name,
            e.last_name,
            e.email,
            e.department,
            d.date,
            d.time_in,
            d.time_out
        FROM employees e
        LEFT JOIN dtr d
            ON e.id = d.employee_id
            AND YEAR(d.date) = ?
    `;

    const params = [year];

    // month = 0 means "all months" / yearly view
    if (month && month !== '0') {
        sql += ` AND MONTH(d.date) = ?`;
        params.push(month);
    }

    sql += ` ORDER BY e.first_name, e.last_name, d.date ASC`;

    db.query(sql, params, callback);
}
};

module.exports = DTR;