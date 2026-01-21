// Nytt projekt: npm init -y i terminalen
// Installera express: npm i express i terminalen
// Sätta igång program om filen heter index.js: node --watch index
// --------------------------------------------------------------------
const express = require("express");
require("pug");

const app = express();
app.listen(3000, () => {console.log("Server running on http://localhost:3000");});
app.set("view engine", "pug")

app.get("/", (req, res) => {
    res.send("HOME");
});
