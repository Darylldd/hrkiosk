const Employee = require('../models/Employee');
const argon2 = require('argon2');

exports.showLogin = (req, res) => {
    res.render('login');
};

exports.login = async (req, res) => {
    const { employee_no, pin } = req.body;
    if (!employee_no || !pin) return res.send("All fields required");

    Employee.findByEmployeeNo(employee_no, async (err, results) => {
        if (err || results.length === 0) return res.send("Invalid credentials");

        const employee = results[0];
        let valid = false;

        // Password verification
        if (employee.pin.startsWith('$argon2')) {
            valid = await argon2.verify(employee.pin, pin);
        } else {
            if (employee.pin === pin) valid = true;
            if (valid) {
                Employee.updatePin(employee.id, pin, (err) => {
                    if (err) console.log("Error hashing legacy PIN:", err);
                });
            }
        }

        if (!valid) return res.send("Invalid credentials");

        // Assign role dynamically based on department/position
        let role = 'employee'; // default
        const hrDepartments = ['HR', 'HRMU']; // add any departments that should be HR/admin
        const hrPositions = ['HR Manager', 'HR Officer']; // optional

        if (hrDepartments.includes(employee.department) || hrPositions.includes(employee.position)) {
            role = 'hr';
        }

        req.session.employee = {
            id: employee.id,
            employee_no: employee.employee_no,
            first_name: employee.first_name,
            last_name: employee.last_name,
            department: employee.department,
            position: employee.position,
            role // dynamic!
        };

        res.redirect('/dashboard');
    });
};

exports.dashboard = (req, res) => {
    res.render('dashboard', { employee: req.session.employee });
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};