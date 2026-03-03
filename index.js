// Nytt projekt: npm init -y i terminalen
// Installera express: npm i express i terminalen
// Sätta igång program om filen heter index.js: node --watch index
// --------------------------------------------------------------------
const express = require("express");
require("pug");

const app = express();
app.listen(3000, () => {console.log("Server running on http://localhost:3000");});
app.set("view engine", "pug")

const {getData, saveData} = require("./db");

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("template");
});

app.get("/index", (req, res) => {
    res.render("index");
});

app.get("/players", (req, res) => {
    const players = getData();
    res.render("index", { players });
});

app.post("/players/create", (req, res) => {

    const players = getData();
    const newplayer = {
        id: Date.now(),
        name: req.body.name,
        ppg: req.body.ppg,
        rpg: req.body.rpg,
        apg: req.body.apg,
        image: req.body.image,
        description: req.body.description
    };

    players.push(newplayer);
    saveData(players);
    res.redirect("/players");
});