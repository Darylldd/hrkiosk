const DTR = require('../models/dtrModel');

// ── Validate year/month from query string ──────────────────────────────────
function sanitizeDateFilter(query) {
    const currentYear = new Date().getFullYear();

    let year = parseInt(query.year, 10);
    if (isNaN(year) || year < 2000 || year > currentYear + 1) {
        year = currentYear;
    }

    let month = parseInt(query.month, 10);
    if (isNaN(month) || month < 0 || month > 12) {
        month = new Date().getMonth() + 1;
    }

    return { year, month: String(month) };
}

exports.showDTR = (req, res) => {
    const userId = req.session.employee.id;

    DTR.getByUser(userId, (err, records) => {
        if (err) return res.status(500).send('Error fetching DTR.');

        DTR.getToday(userId, (err2, todayRecords) => {
            if (err2) return res.status(500).send('Error fetching today\'s DTR.');
            const todayRecord = todayRecords[0] || null;

            DTR.getWeek(userId, (err3, weekRecords) => {
                if (err3) return res.status(500).send('Error fetching weekly DTR.');

                let totalWeekHours = 0;
                weekRecords.forEach(r => {
                    if (r.time_in && r.time_out) {
                        totalWeekHours += (new Date(r.time_out) - new Date(r.time_in)) / 1000 / 3600;
                    }
                });

                let todayHours = 0;
                if (todayRecord?.time_in && todayRecord?.time_out) {
                    todayHours = (new Date(todayRecord.time_out) - new Date(todayRecord.time_in)) / 1000 / 3600;
                }

                res.render('dtr', {
                    records,
                    todayRecord,
                    todayHours: todayHours.toFixed(2),
                    weekHours: totalWeekHours.toFixed(2)
                });
            });
        });
    });
};

exports.clockIn = (req, res) => {
    const userId = req.session.employee.id;

    DTR.getToday(userId, (err, todayRecords) => {
        if (err) return res.status(500).send('Error checking today.');

        if (todayRecords.length && todayRecords[0].time_in) {
            return res.status(400).send('Already clocked in today.');
        }

        DTR.clockIn(userId, (err2) => {
            if (err2) return res.status(500).send('Error clocking in.');
            res.redirect('/dtr');
        });
    });
};

exports.clockOut = (req, res) => {
    const userId = req.session.employee.id;

    DTR.getToday(userId, (err, todayRecords) => {
        if (err) return res.status(500).send('Error checking today.');

        const today = todayRecords[0];
        if (!today || today.time_out) {
            return res.status(400).send('Cannot clock out — not clocked in or already clocked out.');
        }

        DTR.clockOut(userId, (err2) => {
            if (err2) return res.status(500).send('Error clocking out.');
            res.redirect('/dtr');
        });
    });
};

exports.showAllDTR = (req, res) => {
    const currentYear = new Date().getFullYear();
    const { year: selectedYear, month: selectedMonth } = sanitizeDateFilter(req.query);

    DTR.getAllUsersFiltered(selectedYear, selectedMonth, (err, results) => {
        if (err) return res.status(500).send('Error fetching DTRs.');

        const users = {};

        results.forEach(r => {
            const empId = r.employee_id;

            if (!users[empId]) {
                users[empId] = {
                    name: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                    department: r.department,
                    records: []
                };
            }

            if (r.date) {
                const hours = r.time_in && r.time_out
                    ? ((new Date(r.time_out) - new Date(r.time_in)) / 1000 / 3600).toFixed(2)
                    : '-';

                users[empId].records.push({
                    date: r.date,
                    time_in: r.time_in,
                    time_out: r.time_out,
                    hours
                });
            }
        });

        res.render('adminDTR', {
            users: Object.values(users),
            employee: req.session.employee,
            selectedYear,
            selectedMonth,
            currentYear
        });
    });
};