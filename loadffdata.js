const fs = require('fs')


function emptyPositions() {
    return {
        QB: [],
        WR: [],
        RB: [],
        TE: [],
        K: [],
        "W/R/T": [],
        DEF: []
    }
}

function fixLabel(label) {
    if (label === "RB/WR") {
        return "W/R/T";
    }
    else if (label === "D/ST") {
        return "DEF";
    }
    else return label;
}

function getPoints(team) {
    if (team.hasOwnProperty("viewingActualPoints")) {
        if (team.viewingActualPoints.hasOwnProperty("value")) {
            return team.viewingActualPoints.value;
        }
    }
    return 0;
}

function handlePlayers(slots, positions, team) {
    for (s of slots) {
        let p = s.position;
        label = fixLabel(p.label)

        if (s.hasOwnProperty(team)) {
            primary = fixLabel(s[team].proPlayer.position)

            player = {
                "name": s[team].proPlayer.nameFull,
                "key": s[team].proPlayer.id,
                "position": label,
                "primary_position": primary,
                "points": getPoints(s[team])
            };
            positions[primary].push(player)
        }
    }
}

function sortNumsToString(num1, num2) {
    return (num1 > num2) ? `${num1}-${num2}` : `${num2}-${num1}`
}


function createGame(boxscore, team, opp, ownerMap) {
    const teamName = boxscore.game[team.toLowerCase()].name;
    const oppName = boxscore.game[opp.toLowerCase()].name;

    teamgame = {
        id: boxscore.game.id,
        year: boxscore.scoringPeriod.season,
        week: boxscore.scoringPeriod.ordinal,
        name: teamName,
        owner: ownerMap.get(teamName),
        pos: emptyPositions(),
        points: boxscore[`points${team}`].total.value.value,
        result: boxscore.game[`${team.toLowerCase()}Result`],
        opponent: {
            points: boxscore[`points${opp}`].total.value.value,
            name: oppName,
            owner: ownerMap.get(oppName)
        },
        bench: emptyPositions(),
    };

    // teamgame.id = `${teamgame.year}${teamgame.week.toString().padStart(2, '0')}-${sortNumsToString(team.toLowerCase(), opp.toLowerCase())}`


    for (g of boxscore.lineups) {
        let postions = teamgame.pos;
        if (!g.hasOwnProperty('group') || (g.group === "BN") || (g.group === "INJURED")) {
            handlePlayers(g.slots, teamgame.bench, team.toLowerCase());
        }
        else if (g.group === "START") {
            handlePlayers(g.slots, teamgame.pos, team.toLowerCase());
        }
        else {
            console.log(`Unknown Group ${g.group}`)
        }
    }

    return teamgame;
}


async function loadgames(yearPath, games, ownerMap) {
    console.log(yearPath);
    const fileList = fs.readdirSync(yearPath);

    //   console.log(fileList);

    fileList.forEach(f => {
        const boxscoreString = fs.readFileSync(`${yearPath}/${f}`);
        const boxscore = JSON.parse(boxscoreString);


        games.push(createGame(boxscore, "Home", "Away", ownerMap));
        games.push(createGame(boxscore, "Away", "Home", ownerMap));
    });
    return games;
}

async function loadTeamInfo(leaguefile) {
    const leaguestring = fs.readFileSync(leaguefile);
    const league = JSON.parse(leaguestring);

    const teamMap = new Map();

    league.divisions.forEach(division => {
        division.teams.forEach(team => {
            // console.log(`Team: ${team.name}, Owner: ${team.owners[0].displayName}`);
            teamMap.set(team.name, team.owners[0].displayName);
        });
    });

    return teamMap;
}



async function loadYears(years) {
    let games = [];
    for (year of years) {
        console.log(`Loading FF: ${year}`)
        // years.forEach (  async (year) =>  {

        ownerMap = await loadTeamInfo(`data/${year}/${year}_standings.json`)
        loadgames(`data/${year}/boxscores`, games, ownerMap);
    };

    return games;
}

module.exports = loadYears;