# Dokumentation
## Intro
Jag har skapat en hemsida med hjälp av pug, express och htmx där det finns ett antal olika funktioner. Man kan kolla på en lista av NBA-spelare, samt klicka in på spelarna för att få ytterliggare information om dem. Här kan man även söka efter spelare samt filtrera efter vilket lag de spelar för.

Utöver det finns det en login/register page, där man kan registrera en ny använder med email addres och lösenord, och sen kan man logga in på det kontot. Med sitt konto kan man skapa egna spelare med olika stats, lag och namn. Man kan även upgradera spelarnas stats med statpoints. Dessa spelare kan ytterliggare läggas in i ett egengjort lag där ett team overall räknas ut.

## Javascript

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
Remove Routen fungerar på nästintill samma sätt som add routen, så den mesta koden förutom HTMX delen är samma. Det är även några små justeringar i hur teamoverall beräknas då den istället kollar om laget är mer än 0 spelare, istället för färre än 5.
```
    if (req.headers["hx-request"]) {
        const allPlayers = await getData("myPlayer.json");
        const myPlayers = allPlayers.filter(p => p.userId === userId);
        const teamPlayers = myPlayers.filter(p => 
            myTeam && myTeam.players.includes(Number(p.id))
        );
```
Här kollas först om requesten kommer från HTMX. Om den gör det så går den vidare med att ta fram alla spelare ur listan, och filtrera ut de som är personens egna spelare. Sen skapas en till konstant med de spelarna som är på ditt lag. Först kollar den om MyTeam finns, alltså om du har ett lag, och sedan kollar den om spelarens id finns med i laget. 

<hr>

#### Register och Login Form Routes
```
app.get("/main/register-form", (req, res) => {
    res.render("partial/registerForm");
});

app.get("/main/login-form", (req, res) => {
    res.render("partial/loginForm");
});
```
Dessa routes är väldigt basic. Allt de gör är renderar register formen samt login formen.

<hr>

#### Register Route
```
app.post("/main/register", async (req, res) => {

    const { username, email, password } = req.body
    const id = "id_" + Date.now()
    const hashedPassword = await bcrypt.hash(password, 12)

    const users = await getData("users.json")
    if (users.find(u => u.email == email)) {
        if (req.headers["hx-request"]) {
            return res.render("partial/registerForm", { 
                error: "User already exists" 
            });
        }
        return res.redirect("/main?UserExists");
    }

    users.push({ id, username, email, password: hashedPassword })
    await saveData(users, "users.json")
    
    if (req.headers["hx-request"]) {
        return res.render("partial/registerForm", { success: "User created! Please login." });
    }
    
    res.redirect("/main?UserCreated")

})
```
I den här routen skapas först några konstanter som vanligt. { username, email, password } = req.body innebär att alla tre skrivs som req.body.username, req.body.email och req.body.password. Id:et tas fram genom att använda Date.now() för att få ett unikt id. Med hashedPassword användes bcrypt.hash() för att kryptera lösenordet så att det inte vem som helst kan få tag på det. Efter det kommer en if sats där vi hittar om den användaren redan finns, och om den gör det renderas partial/registerForm med variabeln error. Sen blir personen tillbaka skickad till /main. <br>
Sedan pushar vi in den nya användaren i users.json med id, username, email och password och sparar efter det. Efter det kommer en till if sats som liknar den föregående, men istället skickar den med variabeln success.

<hr>

#### Login Route
```
app.post("/main/login", async (req, res) => {

    const email = req.body.email
    const password = req.body.password

    const users = await getData("users.json")
    const user = users.find(u => u.email == email)

    if (!user) {
        if (req.headers["hx-request"]) {
            return res.render("partial/loginForm", { 
                error: "User not found" 
            });
        }
        return res.redirect("/main?NoUserFound");
    }

    const passwordCheck = await bcrypt.compare(password, user.password)
    if (!passwordCheck) {
        if (req.headers["hx-request"]) {
            return res.render("partial/loginForm", { 
                error: "Wrong Password" 
            });
        }
        return res.redirect("/main?WrongPassword");
    }

    req.session.loggedIn = true
    req.session.email = user.email
    req.session.username = user.username
    req.session.userId = user.id
    req.session.admin = user.admin

    if (req.headers["hx-request"]) {
        res.set("HX-Redirect", "/main");
        return res.status(200).send();
    }
    
    res.redirect("/main?LoginSuccess")
})
```
I början skrivs det in några konstanter/variabler. Sen kollar den om användaren inte finns, och om inte så kommer den kolla om det är från en HTMX request, och om det är det kommer den rendera partial/loginForm och skicka med variabeln error: "User not found". <br>
Efter detta införs en ny konstant passwordCheck som använder bcrypt.compare() för att jämföra om det du skrev in och användarens lösenord är samma. Om det inte stämmer kollar den om det kommer från en HTMX request, och sedan rednerar partial/loginForm med variabeln error: "Wrong Password". <br>
Sen sätts req.session.loggedIn till true vilken helt enkelt innebär att man är inloggad. Ytterliggare sätts email, username och id in med req.session, men även en admin variabel (Däremot har jag inte använt den än). <br>
Till sist kollar den igen efter en HTMX request, och om den fått den gör den en HX-Redirect till /main, vilket fungerar på liknande sätt som en vanlig redirect. Skillnaden mellan dem är att på en vanlig res.redirect() hanterar browsern att redirecta, medans en HX-Redirect låter HTMX hantera det. Det den då gör att är HTMX slutar updatera sidan och istället laddar om/går till en ny sida. Det är bra att ha vid bl.a. login. 

<hr>

#### Logout Route
```
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        if (req.headers["hx-request"]) {
            return res.render("partial/loginStatus", { loggedIn: false });
        }
        res.redirect("/main");
    });
});
```
Den här routen är ganska straight forward. Sessionen blir först förstörd och sedan kommer HTMX användas för att rendera partial/loginStatus med variabeln loggedIn: false, vilket då kommer visa att du inte är inloggad. Till sist redirectar den dig till /main.

<hr>

### Db.js
```
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
```
Den här har jag inte så mycket att säga om eftersom det är i princip exakt samma sak som gjordes i halvkursprojektet. <br>
Det som sker är att tre funktioner skapas, saveData, getData och auth. saveData tillåter dig att spara ner data till en fil som om inget skrivs är db.json. Så den skriver över det som finns i den filen med den nya datan. <br>
getData är liknande men istället för att spara ner data kommer den istället läsa den och returnera den data. <br>
auth gjorde vi också och den kollar om personen är inloggad eller inte. Om inte blir man tillbaka skickad till /main. <br>
Till sist exporteras dessa funktioner med module.exports = {getData, saveData, auth} och de hämtas in i index.js med den här raden:
```
const {getData, saveData, auth} = require("./db");
```
<hr>

## Pug
Pug är en template engine för Node.js och används ofta med Express. Det används till att skapa HTML på ett enklare sätt. Exempelvis om du ska skriva en h1 tag med texten Hello så behöver du bara skriva h1 Hello. Detta gör att koden blir mindre, mer strukturerad och lättare att läsa.

<hr>

### Template.pug

#### Document
```
doctype html
html(lang="en")
    head
        meta(charset="UTF-8")
        include style.pug 
        meta(name="viewport", content="width=device-width, initial-scale=1.0")
        title Document
        script(src="https://unpkg.com/htmx.org@1.9.10")
        script(src="https://unpkg.com/hyperscript.org@0.9.12")
```
Den här delen är väldigt likt så det ser ut i HTML och skrivs inte för hand. Include style.pug är för att "css" filen ska fungera. 
```
        script(src="https://unpkg.com/htmx.org@1.9.10")
        script(src="https://unpkg.com/hyperscript.org@0.9.12")
```
Den första raden gör att HTMX kan användas i Pug. Den andra scripten gör att man kan använda enkel logik direkt i Pug filerna.

<hr>

#### Header
```
    header
        nav 
            if !loggedIn
                a(href="/main") Login/Register
            else
                a(href="/main") Home
            a(href="/players") Players

            if loggedIn
                a(href="/myPlayer") MyPlayer
                a(href="/myTeam") MyTeam
            
            div#loginStatus
                include partial/loginStatus
```
##### Pug Struktur
Pugs struktur liknar mer något man skulle se i python då man använder sig av indenteringar för att definera vad som tillhör vad. Här har jag skrivit in ett helt vanligt header och nav element, som fungerar på samma sätt som i HTML. Men här används inga paranteser eller måsvingar, istället använder man indentering för att se vad som tillhör vad. I koden ser vi att nav elementet ligger i header elementet. <br>
Ytterliggare ligger det fler element i nav:en. Den första kollar först om personen inte är inloggad, och om inte så kommer det finnas en länk som det står Login/Register på och leder till /main. Däremot om personen är inloggad kommer det stå Home istället. Sen finns en till länk som leder till /players. Efter det finns en till if sats som säger att om personen är inloggad kommer länkarna till /myPlayer och /myTeam synas. <br>
Till sist finns det en div med id:et loginStatus. Den här div:en innehåller en rad där det står include partial/loginStatus. Det innnebär att där kommer den filen med respektive namn att visas.

##### partial/loginStatus.pug
```
if loggedIn
    p You are logged in as #{username}
    a(href="/logout") Log Out
else
    p You are not logged in
```
Detta innebär att om personen är inloggad kommer det att stå "You are logged in as" + ditt username, och det kommer även finnas en Log out länk som leder dig till /logout routen. Om du inte är inloggad kommer det ändast stå "You are not logged in"

<hr>

#### Main
```
    main
        block content
            .mainDiv 
                if !loggedIn
                    .auth-forms
                        div#registerSection
                            include partial/registerForm
                        
                        hr
                        
                        div#loginSection
                            include partial/loginForm
                else
                    h2 Welcome back, #{username}!
                    p You are already logged in. Use the menu to manage your players and team.
```
Här har vi main elementet. Fungerar på samma sätt som jag beskrev i headern. Däremot introduceras ett nytt element i början. Block content är en sak som tillhör Pug. Själva block är den faktiska funktionen och content är bara ett slags variabel namn som man väljer själv. Ett block kan man förklara som en låda av element, som senare kan bytas ut, vilket vi kommer att göra som småningom. Dessa lådor brukar kallas för mallar eller templates. <br>
Efter det kommer vi till .mainDiv vilket är en div med klassen mainDiv. Alltså om man skriver .nånting kommer det att vara en div med den klassen. I den här diven kollas det om personen inte är inloggad, och om inte så är det en till div med klassen auth-forms som innehåller två divar med id registerSection samt loginSection. Båda dessa divar har en include partial/registerForm eller partial/loginForm. <br>
Om man är inloggad istället kommer det stå Welcome back och sedan ditt username. Under det kommer att stå lite text också.

##### partial/registerForm.pug
```
.form-container
    h2 Register user
    if error
        p.error= error
    if success
        p.success= success
    form(action="/main/register" method="POST" hx-post="/main/register" hx-target="closest .form-container" hx-swap="outerHTML")
        
        label(for="username") Username:
        input#username(type="username" name="username" required)

        label(for="email") Email:
        input#email(type="email" name="email" required)

        label(for="password") Password:
        input#password(type="password" name="password" required)

        button(type="submit") Register
```
I den här filen är det en div med klassen form-container. Under det står det Register user i en h2 tag och sedan två if satser. Den ena är om det blir ett error och den andra success. I Javascripten skickades det med error meddelanden och success meddelanden ibland som variabler. Det är här de används. Så om något är fel kommer den skriva ut error, vilket kommer visa olika grejer beroende på vilket error som skickade med i JS. Samma med success. <br>
Sedan kommer det en form som är kopplat till /main/register med POST metoden. hx-post gör att vi kan skicka det som en HTMX post variant, vilket innebär att vi inte måste ladda om hela sidan, och bara updatera en liten del. hx-target="closest .form-container" gör så att att den kommer updatera den närmsta förälderna med klassen form-container. I detta fallet kommer det att vara hela vår div. Till sist gör hx-swap="outerHTML" att det hela det elementet som hx-target pekar på kommer ändras. Om det hade varit innnerHTML istället hade bara innehållet i den ändrats. <br>
Sedan använder man indentering igen för att visa vad som ska vara med i formen. I detta fallet är det tre inputs med en label var och en submit knapp. Label är en slags text som används till input för att människor som har exempelvis nedsatt syn eller blindhet ska kunna få det uppläst vad det står. Då kopplar label det som står i for="" till inputen med det id:et. Inputen fungerar som vanligt i HTML. Submit knappen är inget särskilt heller då det bara är en knapp med typen submit som det står Register på.

##### partial/loginForm
```
.form-container
    h2 Log in 
    if error
        p.error= error
        
    form(action="/main/login" method="POST" hx-post="/main/login" hx-target="closest .form-container" hx-swap="outerHTML")

        label(for="emailL") Email:
        input#emailL(type="email" name="email" required)

        label(for="passwordL") Password:
        input#passwordL(type="password" name="password" required)

        button(type="submit") Log in
```
Det här kommer jag förklara så mycket eftersom det fungerar på samma sätt som register. En skillnad är att jag lagt till ett extra L (tänkt att betyda Login) efter varje label input id, emailL och passwordL för att de ska vara annorlunda från de i Register.

<hr>

#### Footer
```
    footer
        block form
```
Två rader kod. Footern innehåller bara en block form.

<hr>

#### MyPlayer Scripts
```
    block mPScripts
        script.
            const random = document.getElementById('random');
            if (random){
                random.addEventListener('click', () => {
                    const stats = ['lay', 'mR', 'tP', 'dunk', 'def', 'reb', 'hand', 'pass', 'spd'];

                    stats.forEach(stat => {
                        let randValue;

                        const roll = Math.random();

                        if (roll < 0.3) {
                            randValue = Math.floor(Math.random() * 40) + 25;
                        } else if (roll > 0.7) {
                            randValue = Math.floor(Math.random() * 20) + 80;
                        } else {
                            randValue = Math.floor(Math.random() * 30) + 50;
                        }

                        const input = document.querySelector(`input[name="${stat}"]`);
                        if (input) input.value = randValue;
                    });


                    const allValues = stats.map(stat => Number(document.querySelector(`input[name="${stat}"]`).value));
                    const overall = Math.round(allValues.reduce((a,b) => a+b, 0) / stats.length);
                    const overallElem = document.getElementById('overallDisplay');
                    if(overallElem) overallElem.textContent = overall;
                });
            }
```
På slutet har jag ett block med namnet mPScripts som inte kommer synas någon gång. Här skrev jag lite JS i Pug filen för att testa lite om det fungerar. Då skriver man bara script. med en indentering efter för att visa vad som ska vara JS. <br>
Här skapas först konstanten random som plockar upp elementet med id:et random. Det ligger i partial/playerForm, vilket vi kommer till senare. Men jag kan säga att det är en simpel knapp som har det id:et. Efter det kollar den om random knappen finns, och om den gör det lägger den till en event listener till när man klickar på knappen. Om man gör det kommer följande hända: en konstant stats skapas där alla statsen finns med. Sen kommer den loopa igenom alla stats med forEach och skapa en variabel randValue och konstanten roll som använder Math.random() för att få ett random nummer mellan 0 och 1. <br>
Om roll är mindre än 0.2 kommer den få en låg stat genom att ta Math.floor vilket avrundar talet neråt, sen ett random tal mellan 0 och 1 som multipliceras med 40, och sedan adderas på 25. Den här formeln ger ett tal mellan 25 och 64. För de andra två fungerar det på exakt samma sätt fast med andra tal för att det ska matcha oddsen och om det är höga, låga eller normala stats. <br>
Sen skapas kosntanten input, som letar upp input fältet med attributet name="stat", kan vara exempelvis tP, def eller reb istället för stat. <br>
Till sist mappar den igenom listan stats och returnerar ett nytt värde för varje element i listan. Sedan hittar den input fältet för varje stat, hämtar de värdena som står där och gör om det till ett tal med Number(). Sedan beräknas overall med samma tekniker som använts tidigare för att beräkna overall, d.v.s reduce(). Sedan hittar den elementet med id:et overallDisplay och om den finns ändras den till det nya overall talet.

<hr>

### Index.pug
När man ska ha en Pug fil som bygger på en annan, använder man sig av extends, som är en innbyggd funktion i Pug. Det betyder att man kan ha kvar samma sida men ändra delar av den super enkelt.
```
extends template.pug

block content
    .mainDiv
        form(
            hx-get="/players" 
            hx-target=".players" 
            hx-trigger="changed"
        )
            input(type="text", name="search", placeholder="Search player...", value=search)
            select(name="team")
                option(value="") Select Team
                each t in teams
                    option(value=t selected=(team==t))= t
            button(type="submit") Filter

    
        .players
            if players && players.length
                each p in players
                    a(href="/index/" + p.id)
                        .player(id='id_' + p.id)
                            img(src=p.image, alt="")
                            h3= p.name
                            p= p.description

            else
                .players
                    p No players found.
```
Extends template.pug innebär att man kan använda de block som finns i template.pug igen för att ändra innehållet. I det här fallet står det block content, vilket betyder att det som står i block content i template.pug kommer ändras till det här när den här filen renderas. I det här blocket finns först en div med klassen mainDiv. I den ligger det först en form där den hämtar data från /players med HTMX. Sedan skickar den än request när något ändras med hx-trigger och hx-target låter oss välja exakt vart innehållet ska hamna, och i det här fallet är det .players. Sen finns det en input ruta som är en sökruta och en select meny. Select menyn har ett antal options där original valet är en knapp som det står Select Team på. Sen är det en loop som loopar igenom alla lagen som finns i teams listan i index.js, och sätter in dom på varsin option. Sist finns det en submit button med texten Filter. <br>
Under detta finns .players. Där står det att om players finns och längden på players är mer än 0, kommer den gå vidare. Nu loopar den igenom alla spelarna och gör var och en till en länk. Sedan skapas ännu en div i länken med klass player och id:et av spelaren. Här läggs det in en bild på varje spelare, deras namn och description. Om det inte finns någon spelare står det No players found. Men det kan inte hända då den här listan inte ska kunna gå att ändra.

<hr>

### Player.pug
```
extends template.pug 

block content
    .singlePlayer
        img(src=player.image)
        h2= player.name
        .stats
            p PPG: #{player.ppg}
            p RPG: #{player.rpg}
            p APG: #{player.apg}
            p= player.description

            a.backBtn(href="/players") ← Back
```
Extendar från template.pug och byter block content. Den här koden är tillför när man har klickat på en spelare för att upp dom i stor vy. Här används klassen singlePlayer på en div. Här läggs bilden in och deras namn. Under det finns ännu en div med klassen stats som innehåller tre av spelarens stats samt description. Längst ner finns också en länk med klassen backBtn som leder personen tillbaks till /players.

<hr>

### MyPlayer.pug
```
extends template.pug 

block content
    div#playersList
        if players && players.length
            each p in players
                include partial/playerCard.pug

        else
            h2 No players found.

block form
    if loggedIn 
        .footerDiv
            button(
                hx-on:click="document.getElementById('createForm').classList.toggle('hidden')"
                type="button"
            ) Create New Player

            div#createForm.hidden
                include partial/playerForm.pug
```
Den här filen extendar också template.pug. Det som den ändrar på i block content är att den tar fram MyPlayer listan. Först finns det en div med id:et playerList. I den kollar den om players listan finns och om längden på den är mer än 0. Sen loopar den igenom för varje spelaren i listan, och låter varje spelare använda sig av partial/playerCard.pug med hjälp av include.

##### partial/playerCard.pug
```
.player(id='id_' + p.id)
    .playerContent
        .playerInfo
            h2= p.name
            h3= p.team
            p= p.description
            p Stat Points: #{p.statPoints}

            p Layup: #{p.lay} | Mid-Range: #{p.mR} | 3PT: #{p.tP} | Dunk: #{p.dunk} | Defence: #{p.def}
            p Rebound: #{p.reb} | Handles: #{p.hand} | Passing: #{p.pass} | Speed: #{p.spd}

            a(href="/myPlayer/upgrade/" + p.id, hx-get="/myPlayer/upgrade/" + p.id, hx-target="body", hx-swap="beforeend") Upgrade Player
            button(
                hx-post="/myPlayer/delete/" + p.id
                hx-target="closest .player"
                hx-swap="outerHTML"
                hx-confirm="Delete this player permanently?"
                type="button"
            ) Delete Player

        .overallBox
            p Overall
            h1= p.overall
```
Här skapas först ett antal divar, bland annat en .player med id:et av spelaren. Sedan finns det även .playerInfo som innehåller spelarens namn, lag, deskription, deras statpoints och alla deras stats. Det finns även en länk till /myPlayer/upgrade/ + id:et vilket är så man upgraderar spelaren. hx-get här gör att inte hela sidan kommer ändras, men är samma som den vanliga varianten. hx-target="body" gör att hela bodyn kommer ändras och hx-swap="beforeend" gör att den upgraderade spelaren kommer läggas längst ner. <br>
Efter det kommer en knapp med texten Delete Player. Den använder sig av hx-post istället för hx-get men fungerar på samma sätt. hx-target är closest .player vilket innebär den föräldern som är närmst som heter .player vilket är den som är längst upp i filen. hx-swap gör att vi byter ut outerHTML, alltså hela elementet självt. hx-confirm är en simpel popup som frågar om du vill radera spelaren permanent, där kan man svara ja eller nej. <br>
Till sist finns det även en .overallBox som innehåller texten Overall och spelarens overall stats.

<br>

```
block form
    if loggedIn 
        .footerDiv
            button(
                hx-on:click="document.getElementById('createForm').classList.toggle('hidden')"
                type="button"
            ) Create New Player

            div#createForm.hidden
                include partial/playerForm.pug
```
Fortsättning på myPlayer.pug och här finns det en block för form. Här kollar den först om personen är inloggad, och om den är det så finns det en .footerDiv med en button i. Den här knappen använder hx-on:click="" vilket innebär att när man klickar på den, händer det som är inom "". I det här fallet hittar den elementet med id:et createForm och sedan togglar den klassen hidden på det elementet. Det gör att den blir synlig. Den här knappen har texten Create New Player. Under det finns då div#createForm.hidden som har en include partial/playerForm.pug i sig.

##### partial/playerForm.pug
```
.create-form
    h3 Create New Player

    form(
        hx-post="/myPlayer/create"
        hx-target="#playersList"
        hx-swap="afterbegin"
        hx-on:htmx:after-request="if(event.detail.xhr.status === 200) { this.reset(); document.getElementById('overallDisplay').textContent = '0'; document.getElementById('createForm').classList.add('hidden') }"
    )
```
Här i finns det diven med klassen create-form. Först står det Create New Player i en h3 tag. Efter det kommer det en form. De tre första hx aspekterna har jag använt mig av innan, fast istället för beforeend har jag nu afterbegin vilket gör att det kommer längst upp. Sedan kommer en lite krånligare rad med hx-on:htmx:after-request="". <br>
hx-on:htmx:after-request betyder att programmet ska köra Javascript direkt efter att HTMX har gjort en request, oavsett om requesten är GET eller POST. if(event.detail.xhr.status === 200) ser svår ut att förstå men betyder helt enkelt att om requesten lyckades utan fel, så kommer den senare gå vidare till nästa steg. Nästa steg är this.reset(). This innebär formen där attributet sitter och reset() betyder att den nollställer alla input-fält. Detta används för att rensa input-fälten efter att en spelare har skapats. <br>
Sen kommer den att hämta elementet med id:et overallDisplay och sätta texten där till 0. På detta sättet nollställs stat overallen varje gång du skapar en spelare. Sen kommer den hämta elementet med id:et createForm och lägga till klassen hidden igen för att dölja den. <br>
```
.field.name
    label Player Name
    input(type="text", name="name", required)

.field.team
    label Team
    select(name="team", required)
        option(value="") Select Team
        each t in teams
            option(value=t selected=(team==t))= t
.field
    label Layup
    input(type="number", name="lay", min="25", max="99", required)
.field
    ...
    ...
    ...

.field
    label Overall
    h2#overallDisplay 0

.field
    button(type="button" id="random") Randomize Stats

.field.desc
    label Description
    textarea(name="description", required)

button(type="submit") Create Player
```
Här är de olika fälten i formen. Dom är ganska straight forward tror jag då jag skrivit hur det fungerar tidigare. På team fältet tas team listan upp igen på samma sätt som gjorts i /players. I mitten finns det även fler stats men alla är inte med här för att ta mindre plats, de ser likadana ut som layup. Här finns även knappen som har random id:et som användes tidigare när random stats skulle beräknas. Description fältet är en textarea, vilket liknar input men man har lite mer plats att skriva fritt. Alla stats kan även vara max 99 och minst 25, annars går det inte.

<hr>

### MyTeam.pug
```
extends template.pug

block content
    include partial/myTeamContent.pug
```
Väldigt kort fil. Det ända den gör är att byta ut block content med partial/myTeamContent.pug.

##### partial/myTeamContent.pug
```
.mainDiv

    h1 My Team 🏀

    h2 Your Team

    include teamOverall

    hr

    h2 Available Players

    include availablePlayers
```
Ytterliggare en välidgt kort fil. Här används både partial/teamOverall och partial/availablePlayers.

##### partial/teamOverall.pug
```
div#teamSection
    if teamPlayers && teamPlayers.length
        div#teamOverall
            h3 Team Overall: #{teamOverall}

        div.players#teamPlayers
            each p in teamPlayers
                .player(id='team-' + p.id)
                    h3= p.name
                    p= p.team
                    p Overall: #{p.overall}

                    button(
                        hx-post="/myTeam/remove/" + p.id
                        hx-target=".mainDiv"
                        hx-swap="outerHTML"
                        hx-confirm="Remove from team?"
                        type="button"
                    ) Remove
    else
        p You have no players in your team.
```
Först skapas en div med id:et teamSection och i den kollar den om teamPlayers finns och om listan är längre än 0. Här i finns div#teamOverall med lagets overall stats. Det finns även en div med klassen players och id:et teamPlayers. Här i loopar den igen teamPlayers och skapar en spelare för varje med namn, lag och overall, samt en knapp för att ta bort spelaren. Det som används i knappen är förklarat tidigare och känns inte som att det behöver upprepas. 

##### partial/availablePlayers.pug
```
div#playersSection
    if myPlayers && myPlayers.length
        .players
            each p in myPlayers
                if !teamPlayers.some(tp => tp.id === p.id)
                    .player(id='playerId_' + p.id)
                        h3= p.name
                        p= p.team
                        p Overall: #{p.overall}

                        button(
                            hx-post="/myTeam/add/" + p.id
                            hx-target=".mainDiv"
                            hx-swap="outerHTML"
                            hx-confirm="Add to team?"
                            type="button"
                        ) Add to Team
    else
        p You have no created players.
```
Den här börjar på samma sätt som teamOverall.pug. Rad 5 kollar om spelaren inte redan finns på laget, och om den inte gör det går den vidare. Resten funkar på samma sätt som det gjorde i teamOverall.

<hr>

##### partial/playerList.pug
```
.players
    if players && players.length
        each p, index in players
            a(href="/index/" + p.id)
                .player(id='id_' + p.id)
                    img(src=p.image, alt="")
                    h3= p.name
                    p= p.description
    else
        p No players found.
```
Här har vi diven med klassen players. Först kollar den om players finns och om längden på den är mer än 0. Sedan loopar den igenom varje spelare i listan players, och tar deras platsnummer, alltså första spelaren kommer vara 0. Sen skapas en länk med /index/ + spelarens id. Spelaren får sedan en div med klassen palyer och har där i deras bild, namn och deskription. Om inte detta går skriver den No players found.

##### partial/upgradePage.pug
```
div.fbgb.show#upgradePage(
    hx-on:click="if(event.target === this) this.classList.remove('show')"
)
    .modal
        h2 Upgrade #{myPlayer.name}
        p Stat Points:
            span#statPoints= myPlayer.statPoints

        if message
            p.error= message

        form(hx-post="/myPlayer/upgrade/" + myPlayer.id, hx-target="#upgradePage", hx-swap="outerHTML")
            - const stats = ['lay', 'mR', 'tP', 'dunk', 'def', 'reb', 'hand', 'pass', 'spd']
            - const statLabels = ['Layup', 'Mid Range', '3PT', 'Dunk', 'Defence', 'Rebound', 'Handles', 'Passing', 'Speed']

            each stat, index in stats
                - const currentValue = myPlayer[stat]
                button(
                    type="submit"
                    name="stat"
                    value=stat
                    disabled=(currentValue >= 99 || myPlayer.statPoints <= 0)
                )= `Upgrade ${statLabels[index]} (${currentValue})`

            button(type="button", hx-get="/myPlayer", hx-target="body", hx-swap="outerHTML") Done
```
I den här delen börjar den med en div med klasserna fbgb och show samt id:et upgradePage. Den här använder hx-on:click="" och när man klickar på då kollar den om det personen klickade är samma sak som det elementet. Då tar den bort klassen show från den. I div.fbgb finns ännu en div med klassen fb. I .fb finns en h2 med texten Upgrade och myPlayerns namn samt deras statpoints. Statpointsen visas med en span istället för div eftersom att en span inte radbryter. Sedan kollar den message ska användas och om den gör det skrivs den ut. Message defineras i index.js /myPlayer/upgrade/:id routen. Det kommer skriva ut No stat points. <br>
Nästa kommer en form använder sig av hx-post="/myPlayer/upgrade" + myPlayer.id, hx-target="#upgradePage" och hx-swap="outerHTML". Dessa har beskrivits tidigare. I den finns två konstanter som skrivs med en - i början för att den ska veta att det är variabler. Sen kommer den loopa igenom listan med stats och kolla deras index, alltså platsen de är på i listan. Sedan skapas kosntanten currentValue som är spelarens stat. Efter det finns en submit button med attributet disabled. Det innebär i det här fallet att den inte fungerar om spelarens stat redan är 99 eller om statpointsen är 0 eller mindre. Sen står det Upgrade och sen namnet på staten och sedan värdet på den. <br>
Till sist finns en Done button som laddar in /myPlayer på bodyn och byter ut hela diven.