// Nytt projekt: npm init -y i terminalen
// Installera express: npm i express i terminalen
// Sätta igång program om filen heter index.js: node --watch index
// --------------------------------------------------------------------
const express = require("express");
require("pug");

const app = express();
app.listen(3000, () => {console.log("Server running on http://localhost:3000");});
app.set("view engine", "pug")

const rawTeams = [
    'atlanta_hawks',
    'boston_celtics',
    'brooklyn_nets',
    'charlotte_hornets',
    'chicago_bulls',
    'cleveland_cavaliers',
    'dallas_mavericks',
    'denver_nuggets',
    'detroit_pistons',
    'golden_state_warriors',
    'houston_rockets',
    'indiana_pacers',
    'los_angeles_clippers',
    'los_angeles_lakers',
    'memphis_grizzlies',
    'miami_heat',
    'milwaukee_bucks',
    'minnesota_timberwolves',
    'new_orleans_pelicans',
    'new_york_knicks',
    'oklahoma_city_thunder',
    'orlando_magic',
    'philadelphia_76ers',
    'phoenix_suns',
    'portland_trail_blazers',
    'sacramento_kings',
    'san_antonio_spurs',
    'toronto_raptors',
    'utah_jazz',
    'washington_wizards'
];

const teams = rawTeams.map(t =>
    t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
);

const {getData, saveData} = require("./db");

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("template");
});

app.get("/players", (req, res) => {
    let players = getData("db.json");

    // apply team filter if provided
    const team = req.query.team;
    if (team && team.length) {
        players = players.filter(p => p.team === team);
    }

    res.render("index", { players, teams, team });
});

app.get("/myPlayer", (req, res) => {
    const players = getData('myPlayer.json');
    res.render('myPlayer', { players, teams });
});

app.post("/myPlayer/create", (req, res) => {

    const players = getData("myPlayer.json");
    const newplayer = {
        id: Date.now(),
        team: req.body.team,
        name: req.body.name,
        ppg: req.body.ppg,
        rpg: req.body.rpg,
        apg: req.body.apg,
        image: req.body.image,
        description: req.body.description
    };

    players.push(newplayer);
    saveData(players, "myPlayer.json");
    res.redirect("/players");
});