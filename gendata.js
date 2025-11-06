const { match } = require('assert');
const { ESRCH } = require('constants');
const fs = require('fs')
const xml2js = require('xml2js');
const path = require('path');




async function loadFile(name) {
    let data = fs.readFileSync(name, 'utf8');

    // Without parser
    let result = await xml2js.parseStringPromise(data /*, options */);



    return result;
}

async function getWeekCount(datadir, year) {
    const weeksDir = path.join(datadir, year.toString(), 'weeks');
    const files = fs.readdirSync(weeksDir);

    let maxWeek = 0;
    for (const file of files) {
        const match = file.match(/^week(\d+)\.xml$/);
        if (match) {
            const weekNum = parseInt(match[1], 10);
            if (weekNum > maxWeek) {
                maxWeek = weekNum;
            }
        }
    }

    return maxWeek;
}


async function initData(datadir, year) {
    let weeks = await getWeekCount(datadir, year);
    let data = {}
    data.all = await loadFile(`${datadir}/${year}/${year}.xml`);
    data.weeks = [];
    for (let i = 1; i <= weeks; i++) {
        let w = await loadFile(`${datadir}/${year}/weeks/week${i}.xml`);
        data.weeks.push(w);
    }
    //    fs.writeFileSync(`data.json`, JSON.stringify(data)); 
    return data;

}

function getTeams(data) {
    let teamlist = data.all.fantasy_content.league[0].teams[0].team;
    //console.log(JSON.stringify(teamlist));

    let teams = {};
    for (let t of teamlist) {
        //    console.log(JSON.stringify(t));
        teams[t.team_key[0]] = {
            name: t.name[0],
            manager: t.managers[0].manager[0].nickname[0],
            scores: [],
            projected: []
        }
    }

    return teams;
}


function addscore(teams, rec) {
    teams[rec.team_key[0]].scores.push(rec.team_points[0].total[0]);
    teams[rec.team_key[0]].projected.push(rec.team_projected_points[0].total[0]);
}

function genScores(teams, data) {
    let current = 1;
    for (let week of data.weeks) {
        for (let match of week.fantasy_content.league[0].scoreboard[0].matchups[0].matchup) {
            // console.log(JSON.stringify(match, null, 2))
            // console.log(match.teams[0])
            if (match.week[0] != current) {
                console.log(`Week out of order. Expecting ${current} but found ${count}`)
                return false
            }

            addscore(teams, match.teams[0].team[0]);
            addscore(teams, match.teams[0].team[1]);
        }

        current += 1;
    }

}

async function runFlow(datadir, year) {
    let data = await initData(datadir, year);
    // console.log(data.weeks[0])
    let teams = getTeams(data);
    // console.log(teams)
    genScores(teams, data);
    //    fs.writeFileSync(`data/teams.json`, JSON.stringify(teams)); 
    return teams;
}

function transformToSheet(teams) {
    let titleRow = [""];
    for (let i = 1; i <= 16; i++) {
        titleRow.push(i);
    }
    let scoreRows = Object.values(teams).map(t => [t.name, ...t.scores]);
    let projectedRows = Object.values(teams).map(t => [t.name, ...t.projected]);

    let scores = [titleRow, ...scoreRows];
    let projected = [titleRow, ...projectedRows];


    return { scores, projected };
}

module.exports = {
    runFlow,
    transformToSheet
};

//runFlow();


