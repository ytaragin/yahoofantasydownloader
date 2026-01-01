const fs = require('fs')
const xml2js = require('xml2js');



async function loadLeagueInfo(year) {
    const yearXML = fs.readFileSync(`data/${year}/${year}.xml`);
    let yearInData = await xml2js.parseStringPromise(yearXML /*, options */);


    let yearData = {};

    let teams = yearInData.fantasy_content.league[0].teams[0].team;
    teams.forEach(team => {
        let teamNum = team.team_id[0]
        yearData[teamNum] = {}
        yearData[teamNum].name = team.name[0]
        yearData[teamNum].owner = team.managers[0].manager[0].nickname[0]
    });

    console.log(yearData);
    // yearStr = JSON.stringify(yearData);
    // fs.writeFileSync("year.json", yearStr);

    return yearData;

}

function addPosToObj(obj, p, position) {
    !(position in obj) && (obj[position] = [])
    obj[position].push(p)
    p.points = parseFloat(p.points)
}

function getResult(teamgame) {
    if (teamgame.points > teamgame.opponent.points) {
        return "Win";
    } else if (teamgame.points < teamgame.opponent.points) {
        return "Loss";
    }
    return "Tie";
}

function sortNumsToString(num1, num2) {
    return (num1 > num2) ? `${num1}-${num2}` : `${num2}-${num1}`
}


function flattenGame(year, week, teamgame, opponent, leagueData) {
    teamgame.id = `${year}${week.toString().padStart(2, '0')}-${sortNumsToString(teamgame.teamnum, opponent.teamnum)}`
    teamgame.year = year;
    teamgame.week = week;

    teamgame.name = leagueData[teamgame.teamnum].name
    teamgame.owner = leagueData[teamgame.teamnum].owner
    teamgame.pos = {
        QB: [],
        WR: [],
        RB: [],
        TE: [],
        K: [],
        "W/R/T": [],
        DEF: []
    };
    teamgame.points = parseFloat(teamgame.points);
    teamgame.opponent = {
        points: parseFloat(opponent.points),
        teamnum: opponent.teamnum,
        name: leagueData[opponent.teamnum].name,
        year: year,
        owner: leagueData[opponent.teamnum].owner
    }
    teamgame.result = getResult(teamgame);
    teamgame.bench = {};
    teamgame.players.forEach(p => {
        if ((p.position == "BN") || (p.position == "IR")) {
            addPosToObj(teamgame.bench, p, p.primary_position);
        } else {
            addPosToObj(teamgame.pos, p, p.position);
        }
    })

    return teamgame
}

// function getTeamName(leagueData, teamgame) {
//     return leagueData[teamgame.year][teamgame.teamnum].name;
// }
// function getResult(teamgame) {
//     if (teamgame.points > teamgame.opponent.points) {
//         return "Win";
//     } else if (teamgame.points < teamgame.opponent.points) {
//         return "Loss";
//     }
//     return "Tie";
// }



function loadmatchups(yearPath, gamelist, leagueData) {
    const fileList = fs.readdirSync(yearPath);

    console.log(yearPath);
    //   console.log(fileList);

    fileList.forEach(f => {
        const matchupString = fs.readFileSync(`${yearPath}/${f}`);
        const matchups = JSON.parse(matchupString);


        matchups.games.forEach(game => {
            gamelist.push(flattenGame(matchups.year, matchups.week, game.team1, game.team2, leagueData));
            gamelist.push(flattenGame(matchups.year, matchups.week, game.team2, game.team1, leagueData));
        });

    });



}


async function loadYears(years) {
    let games = []

    for (year of years) {
        console.log(`Loading Yahoo: ${year}`)
        // years.forEach (  async (year) =>  {
        leagueData = await loadLeagueInfo(year);
        //        leagueData[year] = await loadLeagueInfo(year);
        loadmatchups(`data/${year}/matchups`, games, leagueData);
    };

    return games;
}


module.exports = loadYears;