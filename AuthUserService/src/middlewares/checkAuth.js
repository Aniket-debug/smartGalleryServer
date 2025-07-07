const { validateToken } = require("../utils/jwtUtils");

function checkAuth(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (token) {
        try {
            const user = validateToken(token);
            req.user = user;
        } catch {
            req.user = null;
        }
    }
    next();
}

module.exports = checkAuth;
