// Nytt projekt: npm init -y i terminalen
// Installera express: npm i express i terminalen
// Sätta igång program om filen heter index.js: node --watch index
// --------------------------------------------------------------------
const express = require("express");
require("pug");
const fs = require("fs").promises;
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
app.use(session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


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

const {getData, saveData, auth} = require("./db");

app.use(express.urlencoded({ extended: true }));

app.get("/main", (req, res) => {

    const templateData = {
        loggedIn: req.session.loggedIn || false,
        email: req.session.email || null
    }

    res.render("template", templateData);
});

app.get("/index/:id", async (req, res) => {
    const players = await getData("db.json");

    const player = players.find(p => p.id == req.params.id);

    res.render("player", { player });
});

app.get("/players", async (req, res) => {
    let players = await getData("db.json");
    const {team, search} = req.query;

    if (team) players = players.filter(p => p.team === team);
    if (search) {
        const lowerSearch = search.toLowerCase();
        players = players.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }

    if (req.headers["hx-request"]) {
        return res.render("partials/playerList", { players });
    }

    const templateData = { players, teams, team, search, 
        loggedIn: req.session.loggedIn || false,
        email: req.session.email || null
    }

    res.render("index", templateData);
});

app.get("/myPlayer", auth, async (req, res) => {
    const players = await getData('myPlayer.json');

    let filteredPlayers = [];

    if (req.session.loggedIn) {
        filteredPlayers = players.filter(p => p.userId === req.session.userId);
    }
    
    const templateData = { teams,
        players: filteredPlayers, 
        loggedIn: req.session.loggedIn || false,
        email: req.session.email || null
    }

    res.render("myPlayer", templateData);
});

app.get("/myPlayer/form", auth, (req, res) => {
    res.render("partial/playerForm", { teams });
});

app.post("/myPlayer/create", auth, async(req, res) => {

    const clampStat = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 25;
        return Math.min(99, Math.max(25, n));
    };

    const players = await getData("myPlayer.json");
    const newPlayer = {
        id: Date.now(),
        userId: req.session.userId,
        team: req.body.team,
        name: req.body.name,
        statPoints: 10,
        lay: clampStat(req.body.lay),
        mR: clampStat(req.body.mR),
        tP: clampStat(req.body.tP),
        dunk: clampStat(req.body.dunk),
        def: clampStat(req.body.def),
        reb: clampStat(req.body.reb),
        hand: clampStat(req.body.hand),
        pass: clampStat(req.body.pass),
        spd: clampStat(req.body.spd),
        description: req.body.description
    };
    const stats = [
        newPlayer.lay,
        newPlayer.mR,
        newPlayer.tP,
        newPlayer.dunk,
        newPlayer.def,
        newPlayer.reb,
        newPlayer.hand,
        newPlayer.pass,
        newPlayer.spd
    ];

    newPlayer.overall = Math.round(
        stats.reduce((a,b) => a + b, 0) / stats.length
    );

    players.push(newPlayer);
    await saveData(players, "myPlayer.json");
    
    if (req.headers["hx-request"]) {
        return res.render("partial/playerCard", { p: newPlayer });
    }
    
    res.redirect("/myPlayer");
});

app.post("/myPlayer/delete/:id", auth, async (req, res) => {
    const id = req.params.id;
    const userId = req.session.userId;
    let myPlayers = await getData("myPlayer.json");
    
    myPlayers = myPlayers.filter(p => !(p.id == id && p.userId === userId));
    
    await saveData(myPlayers, "myPlayer.json");
    
    if (req.headers["hx-request"]) {
        return res.status(200).send("");
    }
    
    res.redirect("/myPlayer");
});

app.get("/myPlayer/upgrade/:id", auth, async (req, res) => {

    const id = req.params.id;
    const myPlayers = await getData("myPlayer.json");
    const myPlayer = myPlayers.find(p => p.id == id);

    if (!myPlayer) return res.status(404).send("Not found");
    if (myPlayer.statPoints <= 0) {
        if (req.headers["hx-request"]) {
            return res.render("partial/upgradeModal", { myPlayer, message: "No stat points" });
        }
        return res.redirect("/myPlayer");
    }
    
    if (req.headers["hx-request"]) {
        return res.render("partial/upgradeModal", { myPlayer });
    }
    
    res.render("upgrade", { myPlayer });

});

app.post("/myPlayer/upgrade/:id", auth, async (req, res) => {
    const id = req.params.id;
    const stat = req.body.stat;

    const myPlayers = await getData("myPlayer.json");
    const myPlayer = myPlayers.find(p => p.id == id);

    if (!myPlayer) return res.redirect("/myPlayer");

    if (stat === "cancel") {
        if (req.headers["hx-request"]) {
            return res.status(200).send("");
        }
        return res.redirect("/myPlayer");
    }

    if (myPlayer[stat] < 99) {
        myPlayer[stat] += 1;
        myPlayer.statPoints -= 1;
    }
    const stats = [
        myPlayer.lay,
        myPlayer.mR,
        myPlayer.tP,
        myPlayer.dunk,
        myPlayer.def,
        myPlayer.reb,
        myPlayer.hand,
        myPlayer.pass,
        myPlayer.spd
    ];

    myPlayer.overall = Math.round(
        stats.reduce((a, b) => a + b, 0) / stats.length
    );


    await saveData(myPlayers, "myPlayer.json");
    
    if (req.headers["hx-request"]) {
        return res.render("partial/upgradeModal", { myPlayer });
    }
    
    res.redirect("/myPlayer");
});

app.get("/myTeam", auth, async (req, res) => {

    const userId = req.session.userId;

    const allPlayers = await getData("myPlayer.json");
    const teams = await getData("myTeam.json");

    const myPlayers = allPlayers.filter(p => p.userId === userId);
    const myTeam = teams.find(t => t.userId === userId) || { players: [] };

    const teamPlayers = myPlayers.filter(p => 
        myTeam.players.includes(Number(p.id)) || myTeam.players.includes(String(p.id))
    )

    let teamOverall = 0;

    if (teamPlayers.length > 0) {
        teamOverall = Math.round(
            teamPlayers.reduce((sum, p) => sum + p.overall, 0) / teamPlayers.length
        )
    }

    const templateData = { myPlayers, teamPlayers, teamOverall,
        loggedIn: req.session.loggedIn || false,
        email: req.session.email || null
    }

    res.render("myTeam", templateData);
});

app.post("/myTeam/add/:playerId", auth, async (req, res) => {
    const userId = req.session.userId;
    const playerId = Number(req.params.playerId);

    const allTeams = await getData("myTeam.json");
    let myTeam = allTeams.find(t => t.userId === userId);

    if (!myTeam) {
        // Create a new team if none exists
        myTeam = { userId, players: [] };
        allTeams.push(myTeam);
    }

    if (myTeam.players.length >= 5) {
        if (req.headers["hx-request"]) {
            return res.status(400).send("Team is full (max 5 players)");
        }
        return res.redirect("/myTeam?error=Max5Players");
    }

    if (!myTeam.players.includes(playerId)) {
        myTeam.players.push(playerId);
    }

    await saveData(allTeams, "myTeam.json");
    
    if (req.headers["hx-request"]) {
        const allPlayers = await getData("myPlayer.json");
        const myPlayers = allPlayers.filter(p => p.userId === userId);
        const teamPlayers = myPlayers.filter(p => 
            myTeam.players.includes(Number(p.id))
        );
        
        let teamOverall = 0;
        if (teamPlayers.length > 0) {
            teamOverall = Math.round(
                teamPlayers.reduce((sum, p) => sum + p.overall, 0) / teamPlayers.length
            );
        }
        
        const templateData = { myPlayers, teamPlayers, teamOverall,
            loggedIn: req.session.loggedIn || false,
            email: req.session.email || null
        }
        
        return res.render("partial/myTeamContent", templateData);
    }
    
    res.redirect("/myTeam");
});

app.post("/myTeam/remove/:playerId", auth, async (req, res) => {
    const userId = req.session.userId;
    const playerId = Number(req.params.playerId);

    const allTeams = await getData("myTeam.json");
    const myTeam = allTeams.find(t => t.userId === userId);

    if (myTeam) {
        myTeam.players = myTeam.players.filter(id => Number(id) !== playerId);
        await saveData(allTeams, "myTeam.json");
    }

    if (req.headers["hx-request"]) {
        const allPlayers = await getData("myPlayer.json");
        const myPlayers = allPlayers.filter(p => p.userId === userId);
        const teamPlayers = myPlayers.filter(p => 
            myTeam && myTeam.players.includes(Number(p.id))
        );
        
        let teamOverall = 0;
        if (teamPlayers.length > 0) {
            teamOverall = Math.round(
                teamPlayers.reduce((sum, p) => sum + p.overall, 0) / teamPlayers.length
            );
        }
        
        const templateData = { myPlayers, teamPlayers, teamOverall,
            loggedIn: req.session.loggedIn || false,
            email: req.session.email || null
        }
        
        return res.render("partial/myTeamContent", templateData);
    }
    
    res.redirect("/myTeam");
});

app.get("/main/register-form", (req, res) => {
    res.render("partial/registerForm");
});

app.get("/main/login-form", (req, res) => {
    res.render("partial/loginForm");
});

app.post("/main/register", async (req, res) => {

    const { email, pin } = req.body
    const id = "id_" + Date.now()
    const hashedPin = await bcrypt.hash(pin, 12)

    const users = await getData("users.json")
    if (users.find(u => u.email == email)) {
        if (req.headers["hx-request"]) {
            return res.status(400).render("partial/registerForm", { 
                error: "User already exists" 
            });
        }
        return res.redirect("/main?UserExists");
    }

    users.push({ id, email, pin: hashedPin })
    await saveData(users, "users.json")
    
    if (req.headers["hx-request"]) {
        return res.render("partial/registerForm", { success: "User created! Please login." });
    }
    
    res.redirect("/main?UserCreated")

})

app.post("/main/login", async (req, res) => {

    const email = req.body.email
    const pin = req.body.pin

    const users = await getData("users.json")
    const user = users.find(u => u.email == email)

    if (!user) {
        if (req.headers["hx-request"]) {
            return res.status(401).render("partial/loginForm", { 
                error: "User not found" 
            });
        }
        return res.redirect("/main?NoUserFound");
    }

    const pinCheck = await bcrypt.compare(pin, user.pin)
    if (!pinCheck) {
        if (req.headers["hx-request"]) {
            return res.status(401).render("partial/loginForm", { 
                error: "Wrong PIN" 
            });
        }
        return res.redirect("/main?WrongPin");
    }

    req.session.loggedIn = true
    req.session.email = user.email
    req.session.userId = user.id
    req.session.admin = user.admin

    if (req.headers["hx-request"]) {
        res.set("HX-Redirect", "/main");
        return res.status(200).send();
    }
    
    res.redirect("/main?LoginSuccess")
})

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        if (req.headers["hx-request"]) {
            return res.render("partial/loginStatus", { loggedIn: false });
        }
        res.redirect("/main");
    });
});