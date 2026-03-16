exports.isAuthenticated = (req, res, next) => {
    if (req.session?.employee) {
        req.employee = req.session.employee;
        return next();
    }
    res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
    if (!req.session?.employee || req.session.employee.department !== 'admin')
        return res.status(403).render('error', { message: 'Access Denied' }); // use a proper error view
    next();
};

exports.ensureAdmin = (req, res, next) => {
    const dept = req.session?.employee?.department;
    if (!dept || !['admin', 'hr'].includes(dept))
        return res.status(403).render('error', { message: 'Access Denied' });
    next();
};

exports.onlyHRAdmin = (req, res, next) => {
    if (!req.session?.employee) return res.redirect('/login');
    const dept = req.session.employee.department;
    if (!['admin', 'hr'].includes(dept))
        return res.status(403).render('error', { message: 'Access Denied' });
    next();
};

exports.onlyHR = (req, res, next) => {
    if (!req.session?.employee) return res.redirect('/login');
    const allowed = ['HRMU', 'HR', 'Finance and Administrative Section (FAS)'];
    if (!allowed.includes(req.session.employee.department))
        return res.status(403).render('error', { message: 'Access Denied' });
    next();
};

exports.onlyAuthorizedDTR = (req, res, next) => {
    if (!req.session?.employee) return res.redirect('/login');
    const allowed = ['HR', 'HRMU', 'Finance and Administrative Section (FAS)', 'admin'];
    if (!allowed.includes(req.session.employee.department))
        return res.status(403).render('error', { message: 'Access Denied' });
    next();
};