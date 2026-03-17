const TravelOrder = require('../models/TravelOrder');
const Employee    = require('../models/Employee');

// HR and admin departments that can see all travel orders
const PRIVILEGED_DEPARTMENTS = ['hrmu', 'admin'];

exports.showTravelOrders = (req, res) => {
    const search    = req.query.search || '';
    const previewId = parseInt(req.query.preview_id, 10) || 0;
    const employee  = req.session.employee;

    // HR/admin see everything (employeeId = null); everyone else sees only
    // travel orders that include their own employee_id in the group.
    const isPrivileged = PRIVILEGED_DEPARTMENTS.includes(
        (employee.department || '').toLowerCase()
    );
    const employeeId = isPrivileged ? null : employee.id;

    TravelOrder.findAll(search, employeeId, (err, orders) => {
        if (err) return res.status(500).send('Error fetching travel orders.');

        let preview = '';
        if (previewId) {
            const order = orders.find(o => o.id === previewId);
            if (order?.file_path?.startsWith('/uploads/travel_orders/')) {
                preview = order.file_path;
            }
        }

        res.render('travelOrders', { orders, search, preview, previewId, employee });
    });
};

exports.showUploadForm = (req, res) => {
    Employee.getAll((err, employees) => {
        if (err) return res.status(500).send('Error loading employees.');
        res.render('uploadTravelOrder', { employees, msg: '', order: {} });
    });
};

exports.uploadTravelOrder = (req, res) => {
    const employee = req.session.employee;

    Employee.getAll((err, employees) => {
        if (err) return res.status(500).send('Error loading employees.');

        const empIds = (Array.isArray(req.body.employee_ids)
            ? req.body.employee_ids
            : [req.body.employee_ids]
        ).map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);

        const pos = Array.isArray(req.body.positions)
            ? req.body.positions
            : [req.body.positions];

        if (!req.file || !empIds.length || !req.body.to_no ||
            !req.body.travel_date || !req.body.destination || !req.body.return_date) {
            return res.render('uploadTravelOrder', {
                employees,
                msg: 'All required fields are missing.',
                order: {}
            });
        }

        const file_path = '/uploads/travel_orders/' + req.file.filename;

        const inserts = empIds.map((emp_id, idx) => ({
            employee_id:            emp_id,
            to_no:                  req.body.to_no,
            travel_date:            req.body.travel_date,
            return_date:            req.body.return_date,
            destination:            req.body.destination,
            salary_per_diem:        req.body.salary_per_diem,
            specific_purpose:       req.body.specific_purpose,
            objectives:             req.body.objectives,
            per_diems_allowed:      req.body.per_diems_allowed,
            appropriation:          req.body.appropriation,
            remarks:                req.body.remarks,
            office_station:         req.body.office_station,
            recommending_approval:  req.body.recommending_approval,
            recommending_position:  pos[idx] || '',
            contact_number:         req.body.contact_number,
            approved_by:            req.body.approved_by,
            file_name:              req.file.filename,
            file_path,
            uploaded_by:            employee.id
        }));

        let completed = 0;
        let hasError  = false;

        inserts.forEach(data => {
            TravelOrder.create(data, (err) => {
                if (err) {
                    console.error('TravelOrder create error:', err);
                    hasError = true;
                }
                completed++;
                if (completed === inserts.length) {
                    if (hasError) return res.render('uploadTravelOrder', {
                        employees, msg: 'Error saving travel order. Please try again.', order: {}
                    });
                    res.render('uploadTravelOrder', {
                        employees, msg: '✅ Uploaded successfully!', order: {}
                    });
                }
            });
        });
    });
};

exports.printTravelOrder = (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) return res.status(400).send('Invalid ID.');

    TravelOrder.findByToId(id, (err, results) => {
        if (err || !results.length) return res.status(404).send('Travel Order not found.');

        const order = results[0];
        const employees = results.map(emp => ({
            employee_id: emp.employee_id,
            full_name:   emp.full_name,
            position:    emp.position || ''
        }));

        res.render('travelOrderPrint', {
            order,
            employees,
            recommending_approval: order.recommending_approval || '',
            recommending_position: order.recommending_position || ''
        });
    });
};