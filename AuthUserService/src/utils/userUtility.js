const { createHmac } = require("crypto");

function match_password(plainPassword, hashedPassword, salt) {
    const hash = createHmac("sha256", salt).update(plainPassword).digest("hex");
    return hash === hashedPassword;
}

module.exports = {
    match_password,
}