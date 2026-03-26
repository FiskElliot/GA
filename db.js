const fs = require('fs').promises;

async function saveData(data, filename = 'db.json') {
    await fs.writeFile(filename, JSON.stringify(data, null, 3));
}

async function getData(filename = 'db.json') {
    const data = await fs.readFile(filename, 'utf8');
    return JSON.parse(data);
}

function auth(req, res, next) {
    if (!req.session.loggedIn) return res.redirect("/main?YouAreNotLoggedIn")
    req.uid = req.session.userId
    next()
}

module.exports = {getData, saveData, auth};