# Dokumentation
## Intro
Jag har skapat en hemsida med hjälp av pug, express och htmx där det finns ett antal olika funktioner. Man kan kolla på en lista av NBA-spelare, samt klicka in på spelarna för att få ytterliggare information om dem. Här kan man även söka efter spelare samt filtrera efter vilket lag de spelar för.

Utöver det finns det en login/register page, där man kan registrera en ny använder med email addres och lösenord, och sen kan man logga in på det kontot. Med sitt konto kan man skapa egna spelare med olika stats, lag och namn. Man kan även upgradera spelarnas stats med statpoints. Dessa spelare kan ytterliggare läggas in i ett egengjort lag där ett team overall räknas ut.

### Index.js

#### Bibliotek
```
require("pug");
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
```
Här importeras alla bibliotek som används. Express, bcryptjs och express-session importeras. Samt berättas det för programmet att pug ska användas. 

<hr>

#### Sessions
```
const app = express();
app.use(session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
```
Här sätter vi en app som konstant/variabel istället för express(), vilket underlättar i framtiden.
Sedan skapas det en session mellan servern och browsern. Servern skickar en cookie till browsern, och browsern skickar tillbaks denna cookie varje servern frågar om den.
Detta gör att man kan spara saker på hemsidan, istället för att de försvinner när man laddar om den.
Datan sparas i req.session

<hr>

#### Global Middleware
```
app.use((req, res, next) => {
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.email = req.session.email || null;
    res.locals.username = req.session.username || null;
    next();
});
```
Dessa raderna gör att alla pug filer kan använda sig av: <br>
req.session.loggedIn <br>
req.session.email <br>
req.session.username <br>
Alltså alla pug filer kan alltid använda email och username från sessionen samt kolla om personen är inloggad eller inte.

<hr>

#### Server start och Pug
```
app.listen(3000, () => {console.log("Server running on http://localhost:3000");});
app.set("view engine", "pug")
```
De här gör att servern startar på porten 3000 samt säger till att den ska använda pug, för res.render() funktionen.

<hr>

#### Teams
```
const rawTeams = [...
];
const teams = rawTeams.map(t =>
    t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
);
```
rawTeams är en lista på alla NBA-lag som finns just nu. Formatet är exempelvis 'atlanta_hawks'. Raden under formaterar om texten till att se ut såhär 'Atlanta Hawks'

<hr>

#### JS Funktioner samt urlencoded
```
const {getData, saveData, auth} = require("./db");
app.use(express.urlencoded({ extended: true }));
```
Den första raden hämtar in funktionerna getData, saveData och auth från fil db.js.Den andra raden gör att man kan använda sig av req.body för att ta saker från url:en.

<hr>

#### Main Route
```
app.get("/main", (req, res) => {

    const templateData = {
        loggedIn: req.session.loggedIn || false,
        email: req.session.email || null
    }

    res.render("template", templateData);
});
```
Den här routen gör nästintill ingenting. Däremot kan jag förklara render funktionen. res.render() är en inbyggd funktion när man använder sig av pug. Det den gör är helt enkelt att den visar saker på hemsidan. Just i den här skickar jag in "template", vilket referar till template.pug filen som även är "default" pug filen kan man säga. Sedan templateData är endast en variable jag skickar med till pug filen, här är jag valt att sätta ihop loggedIn variabeln och email variablen till en som jag kallade templateData. Detta gör jag flera gånger senare.

<hr>

#### Index Route
```
app.get("/index/:id", async (req, res) => {
    const players = await getData("db.json");

    const player = players.find(p => p.id == req.params.id);

    res.render("player", { player });
});
```
Den här routen är till för när man vill visa en enskild spelare i players listan. Så en spelare filtreras ut ur players listan och sedan skickas den spelarens variabel med när player.pug filen renderas.

<hr>

#### Players route
```
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
```
Den här routen låter dig se players listan samt filtrera efter lag samt söka efter spelare. Först skapas tre variabler, players som är players listan och konstanterna req.query.team och req.query.search. Sedan kollar den om man valt något lag, och isåfall filtrerar den ut det laget. Sen funkar det liknande med om man sökt på något namn. 
<br>

```
    if (req.headers["hx-request"]) {
        return res.render("partials/playerList", { players });
    }
```
Här skickas en hx-request som senare kommer returnerna true. Det gör att den sedan kommer returnera re.render("partials/playerList", {players}); vilket renderar en partial, som är htmx och ändrar bara en liten del av hemsidan.

<hr>

#### MyPlayer Route
```
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
```
I den här delen av koden bestäms myPlayer routen. Först hämtar den alla spelare från myPlayer.json. Sedan skapar den en annan tom lista som heter filteredPlayers. Om personen är inloggad kommer filteredPlayers vara players listan men bara med de spelare som tillhör personens egna userId. Alltså kan man bara se sina egna spelare. Sen som tidigare sagt skickas variablerna med i form av templateData till filer myPlayer.pug.

<hr>

#### MyPlayer Form Route
```
app.get("/myPlayer/form", auth, (req, res) => {
    res.render("partial/playerForm", { teams });
});
```
En väldigt kort route. Här används htmx för att rendera playerForm.pug partialen, samt med teams variabeln. Detta gör att formen för att skapa en ny MyPlayer kommer bara ändra en liten del på hemsida, i det här fallet kommer det vara footern men det förklarar jag mer när jag förklarar pug.

<hr>

#### MyPlayer Create Route
```
    const clampStat = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 25;
        return Math.min(99, Math.max(25, n));
    };
```
Här skapas konstanten clampStat vilket kommer vara en siffra. const n = Number(value) gör om så att value alltid kommer vara en siffra, alltså om det står "50" så görs det om till 50. Raden under betyder att om n inte är ett riktigt tal, så kommer den returnera 25. Sedan används Math.min och Math.max för att definera talet så att det minst är 25 och max 99.

<br>

```
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
```
Här skapas konstanten newPlayer, vilket kommer vara ett objekt. Alla data läggs in i den nya spelaren samt ett id och userId läggs till. Sedan skapas även konstanten stats, vilket kommer vara alla de nya statsen. Efter det beräknas en ovarall på spelaren, där Math.round används för att avrunda talet. Det beräknas genom att ta stats.reduce vilket adderar ihop alla talen från listan, och till sist delas på längden av stats listan för att få en overall. <br>
Sedan läggs den nya spelaren till bland de andra MyPlayer spelarna, och sparas ner med saveData funktionen. Till sist används htmx igen för att göra dessa ändringar bara på en liten del av hemsidan, vilket i det här fallet kommer vara i partial/playerCard. Slutligen skickas personen tillbaks till /myPlayer.

<hr>

#### MyPlayer Delete Route
```
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
```
I den här routen kan man ta bort enskilda spelare från MyPlayer sidan. myPlayers listan tas fram och sedan filtreras den enskilda spelaren ut med hjälp av id och userId. Sedan sparas den nya spelaren i myPlayer.json. Sedan kollar den om det är en htmx request. Statuskoden 200 är till för att visa att den lyckats, samt sedan skickar den även med en tom sträng. Den skickas med eftersom om servern inte skickar tillbaks något kan HTMX råka göra fel eller ingenting.

<hr>

#### GET MyPlayer Upgrade Route
```
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
```
Först hittas spelare som personen vill upgradera. Sedan skickar den ett error "Not Found" meddelande om spelaren inte finns (Kan typ inte hända eftersom att man inte ser spelaren om den inte finns). Sen kollar den om spelarens statpoints är mindre eller lika med 0, om det är det kommer den visa partial/upgradePage med HTMX samt skicka in meddelandet "No stat points" och skicka tillbaka dig till /myPlayer, vilket är där du var så inget händer. Om du däremote har mer än 0 stat points kommer den göra samma sak fast utan att skicka med "No stat points" meddelandet. Efter det kommer den dock istället för att skicka tillbaka dig, kommer den rendera upgrade.pug filen, där alla upgraderings val visas.

<hr>

#### POST MyPlayer Upgrade Route 
```
app.post("/myPlayer/upgrade/:id", auth, async (req, res) => {
    const id = req.params.id;
    const stat = req.body.stat;

    const myPlayers = await getData("myPlayer.json");
    const myPlayer = myPlayers.find(p => p.id == id);

    if (!myPlayer) return res.redirect("/myPlayer");

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
        return res.render("partial/upgradePage", { myPlayer });
    }
    
    res.redirect("/myPlayer");
});
```
Här defineras först några variabler, id, stat och myPlayers. Sedan letas den sökta spelaren up med find funktionen. Sen kollar den om myPlayer's stats är mindre än 99, och om den är det öker den staten med 1 och dina stat points minskar med 1. Sedan beräknas overall på nytt med hjälp av en lista med alla stats. Efter det sparas den nya verisionen av spelaren ner, och HTMX används även för att visa allt detta på en liten ruta genom att rendera partial/upgradePage. Efter detta redirectar den tillbaks till /myPlayer.

<hr>

#### MyTeam Route
```
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
```
Som vanligt defineras variabler först som userId, allPlayers, teams. allPlayers listan och teams listan görs sedan om till myPlayers och myTeam som hittar bara dina egna spelare och visar ditt eget lag. Sen defineras teamPlayers genom att filtrera ut endast de spelar som är med på laget med hjälp av deras id. Efter det beräknas overall. Den börjas med att sättas till 0. Sedan kollar den först om längden på teamPlayers listan är längre än 0, och om den är så gör den likadant som förra gången för att beräkna overall. Sen använda jag template data igen för att skicka med variabler när jag renderar myTeam.pug.

<hr>

#### MyTeam Add Route
```
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
    
```
För att få variabeln/listan myTeam användes find funktionen på en lista med alla lagen (myTeam.json). Sedan kollar den om myTeam inte finns, och om det inte gör det skapar den laget med två villkor, ett userId och en players lista. Sedan läggs det nya laget in i myTeam.json. Efter det kollar den om längden på lagets spelarlista är större eller lika med 5. Om det är det kommer den redirecta dig tillbaks. Efter det kommer den kolla om den spelarens id redan är på laget, och om inte så kommer den att lägga till den spelaren. Sedan sparar den det nya laget.

<br>

```
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
```
Här kollar den först om HTMX används, och om den gör det går den vidare. Efter tar den alla spelarna, och filtrera ut de som är personens egna. På liknande sätt filtrerar den fram spelarna på ditt lag. Sedan bestäms teamOverall på samma sätt som tidigare gjorts, alltså adderar ihop all spelares overall och delar på mängden spelare. Sedan ytterliggare som tidigare skapas konstanten templateData med alla variabler som behöver skickas med, och till sist renderas partial/myTeamContent. När detta är klart redirectar den dig till /myTeam.

<hr>

#### MyTeam Remove Route









### Pug
