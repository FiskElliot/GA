const fs = require("fs");

function saveData(data){
    fs.writeFileSync("db.json", JSON.stringify(data, null, 3))
}

function getData(){
    return JSON.parse(fs.readFileSync("db.json").toString())
}

module.exports = {getData, saveData}