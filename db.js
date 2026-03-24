const fs = require('fs');

function saveData(data, filename = 'db.json') {
    fs.writeFileSync(filename, JSON.stringify(data, null, 3));
}

function getData(filename = 'db.json') {
    return JSON.parse(fs.readFileSync(filename).toString());
}







module.exports = { getData, saveData };