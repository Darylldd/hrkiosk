const db = require('../config/db');

const Payslip = {

create: (data, callback) => {

const sql = `INSERT INTO payslips
(employee_id, month, cutoff, basic_pay,
late_absences, pagibig_mp1, pagibig_mp2,
pagibig_mpl, pagibig_calamity, sss,
philhealth, tax, disallowances,
totalDeductions, netPay)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

const params = [
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
data.netPay
];

db.query(sql, params, callback);

},

getAll: (callback) => {

const sql = `
SELECT
p.id,
CONCAT(e.first_name,' ',IFNULL(e.middle_name,''),' ',e.last_name) AS employee_name,
p.month,
p.cutoff
FROM payslips p
LEFT JOIN employees e ON e.id = p.employee_id
ORDER BY p.month DESC
`;

db.query(sql, callback);

},

findById: (id, callback) => {

const sql = `
SELECT
p.*,
CONCAT(e.first_name,' ',IFNULL(e.middle_name,''),' ',e.last_name) AS employee_name,
e.account_no,
e.email
FROM payslips p
LEFT JOIN employees e ON e.id = p.employee_id
WHERE p.id = ?
`;

db.query(sql,[id],callback);

},

getByEmployeeId: (employeeId, callback) => {

const sql = `
SELECT id, month, cutoff
FROM payslips
WHERE employee_id = ?
ORDER BY month DESC
`;

db.query(sql,[employeeId],callback);

}

};

module.exports = Payslip;