const db = require('../config/db');

const User = {
    create: (userData, callback) => {
       const sql = "INSERT INTO users (name, email, password, role, position) VALUES (?, ?, ?, ?, ?)";
db.query(sql, [
    userData.name,
    userData.email,
    userData.password,
    userData.role,
    userData.position
], callback);
    },

    findByEmail: (email, callback) => {
        const sql = "SELECT * FROM users WHERE email = ?";
        db.query(sql, [email], callback);
    },
    findById: (userId, callback) => {
        const sql = "SELECT * FROM users WHERE id = ?";
        db.query(sql, [userId], callback);
    },

  updateProfile: (userId, data, callback) => {
    const { name, employee_id, department, email, contact, account_no, profile_pic, position } = data;

   let sql = `UPDATE users 
           SET name = ?, employee_id = ?, department = ?, email = ?, contact = ?, account_no = ?, position = ?`;
const params = [name, employee_id, department, email, contact, account_no, position];
    if(profile_pic) {
        sql += `, profile_pic = ?`;
        params.push(profile_pic);
    }

    sql += ` WHERE id = ?`;
    params.push(userId);

    db.query(sql, params, callback);
},
    getAllEmployees: (callback) => {
    const sql = "SELECT id, name, department, account_no, position FROM users WHERE role = 'employee' ORDER BY name ASC";
    db.query(sql, callback);
},
updatePassword: (userId, hashedPassword, callback) => {
    const sql = "UPDATE users SET password = ? WHERE id = ?";
    db.query(sql, [hashedPassword, userId], callback);
}
};

module.exports = User;