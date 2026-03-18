const TravelOrder = require('../models/TravelOrder');
const Employee    = require('../models/Employee');
const AuditLog    = require('../models/AuditLog');

const PRIVILEGED_DEPARTMENTS = ['hrmu', 'admin'];

function isPrivileged(employee) {
    return PRIVILEGED_DEPARTMENTS.includes((employee.department || '').toLowerCase());
}

// ── List / preview ─────────────────────────────────────────────────────────
exports.showTravelOrders = (req, res) => {
    const search       = (req.query.search || '').trim();
    const previewToNo  = req.query.preview_to_no || '';          // ← to_no, not a DB id
    const employee     = req.session.employee;
    const employeeId   = isPrivileged(employee) ? null : employee.id;

    TravelOrder.findAll(search, employeeId, (err, orders) => {
        if (err) return res.status(500).send('Error fetching travel orders.');

        let preview = '';
        if (previewToNo) {
            // Only serve the preview path if this employee actually appears on the TO
            const order = orders.find(o => o.to_no === previewToNo);
            if (order?.file_path?.startsWith('/uploads/travel_orders/')) {
                preview = order.file_path;
            }
            // If order not found in their scoped list → preview stays '' (access denied silently)
        }

        res.render('travelOrders', {
            orders,
            search,
            preview,
            previewToNo,
            employee,
        });
    });
};

// ── Upload form ────────────────────────────────────────────────────────────
exports.showUploadForm = (req, res) => {
    Employee.getAll((err, employees) => {
        if (err) return res.status(500).send('Error loading employees.');
        res.render('uploadTravelOrder', { employees, msg: '', order: {} });
    });
};

// ── Upload POST ────────────────────────────────────────────────────────────
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
        const toNo      = req.body.to_no;

        const inserts = empIds.map((emp_id, idx) => ({
            employee_id:           emp_id,
            to_no:                 toNo,
            travel_date:           req.body.travel_date,
            return_date:           req.body.return_date,
            destination:           req.body.destination,
            salary_per_diem:       req.body.salary_per_diem,
            specific_purpose:      req.body.specific_purpose,
            objectives:            req.body.objectives,
            per_diems_allowed:     req.body.per_diems_allowed,
            appropriation:         req.body.appropriation,
            remarks:               req.body.remarks,
            office_station:        req.body.office_station,
            recommending_approval: req.body.recommending_approval,
            recommending_position: pos[idx] || '',
            contact_number:        req.body.contact_number,
            approved_by:           req.body.approved_by,
            file_name:             req.file.filename,
            file_path,
            uploaded_by:           employee.id,
        }));

        let completed = 0;
        let hasError  = false;

        inserts.forEach(data => {
            TravelOrder.create(data, (err) => {
                if (err) { console.error('TravelOrder create error:', err); hasError = true; }
                completed++;
                if (completed === inserts.length) {
                    if (hasError) return res.render('uploadTravelOrder', {
                        employees, msg: 'Error saving travel order. Please try again.', order: {}
                    });

                    // ── Audit log ──
                    AuditLog.log({
                        employee_id:   employee.id,
                        employee_name: `${employee.first_name} ${employee.last_name}`,
                        action:        'UPLOAD_TRAVEL_ORDER',
                        details:       `TO# ${toNo} · ${req.body.destination} · ${req.body.travel_date} → ${req.body.return_date} · ${empIds.length} employee(s)`,
                        ip_address:    req.ip,
                    });

                    res.render('uploadTravelOrder', {
                        employees, msg: '✅ Uploaded successfully!', order: {}
                    });
                }
            });
        });
    });
};

// ── Print via POST — to_no in request body, nothing in the URL ────────────
exports.printTravelOrder = (req, res) => {
    const toNo     = (req.body.to_no || '').trim();
    const employee = req.session.employee;

    if (!toNo) return res.status(400).send('Invalid Travel Order number.');

    // Pass employeeId = null for HR/admin (unrestricted),
    // pass the real id for everyone else (model will check they're on this TO)
    const scopedId = isPrivileged(employee) ? null : employee.id;

    TravelOrder.findByToNo(toNo, scopedId, (err, results) => {
        if (err) {
            console.error('printTravelOrder error:', err);
            return res.status(500).send('Error fetching travel order.');
        }

        // Empty result = either not found OR employee is not on this TO
        if (!results.length) return res.status(403).send('Travel Order not found or access denied.');

        const order = results[0];
        const employees = results.map(r => ({
            employee_id: r.employee_id,
            full_name:   r.full_name,
            position:    r.position || '',
        }));

        // ── Audit log ──
        AuditLog.log({
            employee_id:   employee.id,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            action:        'PRINT_TRAVEL_ORDER',
            details:       `TO# ${toNo}`,
            ip_address:    req.ip,
        });

        res.render('travelOrderPrint', {
            order,
            employees,
            recommending_approval: order.recommending_approval || '',
            recommending_position: order.recommending_position || '',
            nonce: res.locals.nonce,
        });
    });
};