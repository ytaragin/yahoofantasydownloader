const fs = require('fs')
const xml2js = require('xml2js');
const loadYearsYahoo = require('./loadyahoodata')
const loadYearsFF = require('./loadffdata');
const _ = require('lodash');


function printPlayers(players) {
    for (pos in players) {
        str = ""
        players[pos].forEach(p => {
            str += `${p.name}(${p.points}) `
        })
        console.log(`${pos}: ${str}`)
    }

}

function printFull(teamgame, num) {
    printGame(teamgame, false, num)
}


function printBrief(teamgame, num) {
    printGame(teamgame, true, num)
}


function printGame(teamgame, brief, num) {
    console.log(`=================${num + 1}=====================`);
    // let teamname = getTeamName(leagueData,teamgame);
    console.log(`Year: ${teamgame.year} Week: ${teamgame.week} Team: ${teamgame.name}`);
    // console.log(`ID: ${teamgame.id}`)
    console.log(`Opponent: ${teamgame.opponent.name} Result: ${teamgame.result} (${teamgame.points}-${teamgame.opponent.points})`);
    //console.log(teamgame);
    if ((brief !== undefined) && !brief) {
        console.log("--------Starters--------");
        printPlayers(teamgame.pos);
        console.log("---------Bench----------");
        printPlayers(teamgame.bench);

    }

}



function getPositionsScoreTotal(game, posList) {
    let sum = 0;
    posList.forEach(pos => {
        sum += game.pos[pos].reduce((prev, cur) => prev + cur.points, 0);
    });
    return sum;
}

function getPositionScoreTotal(game, pos) {
    return game.pos[pos].reduce((prev, cur) => prev + cur.points, 0);
}


function getMaxDefK(games) {
    return games.reduce((prev, current) => {
        if (getPositionsScoreTotal(prev, ["DEF", "K"]) >= getPositionsScoreTotal(current, ["DEF", "K"])) {
            // console.log(prev.pos.DEF + prev.pos.K);
            return prev
        }
        // console.log(getPositionScoreTotal(prev, "DEF")+getPositionScoreTotal(prev, "K"));
        return current
    })
}

function getTopDefK(games) {
    games.sort((first, second) => getPositionsScoreTotal(second, ["DEF", "K"]) - getPositionsScoreTotal(first, ["DEF", "K"]));
    return games[0];
}

function iteratePlayersInGame(playerList, handlePlayer) {
    for (const [pos, players] of Object.entries(playerList)) {
        for (player of players) {
            handlePlayer(player);
        }
    }
}




function gameHasNegativeScore(game) {
    let negPlayers = undefined;
    iteratePlayersInGame(game.pos, p => {
        if (p.points < 0) {
            if (!negPlayers) {
                negPlayers = [];
                negPlayers.push(p)
            }
        }
    });
    return negPlayers;
}

function findNegGames(games) {
    return games.filter(gameHasNegativeScore);
}

function genGameIterator(game) {
    let iterationCount = 0;
    let positions = Object.keys(game.pos);
    let posIndex = 0;
    let playIndex = 0;


    const gameIterator = {
        next: function () {
            let result;
            if (posIndex < positions.length) {
                if (playIndex < positions[posIndex].length) {
                    result = { value: positions[posIndex][playIndex], done: false }
                }
                playIndex++;
                if (playIndex >= curplayers.length) {
                    playIndex = 0;
                    posIndex++;
                }
                iterationCount++;
                return result;
            }
            return { value: iterationCount, done: true }
        }
    };
    return gameIterator;
}

function pointsAffectOutcome(game, points) {
    let delta = game.points - game.opponent.points;
    return (Math.sign(delta - points) != Math.sign(delta));
}



function getMaxPlayerInCategory(players) {
    let maxpoints = 0;
    iteratePlayersInGame(players, player => {
        maxpoints = Math.max(maxpoints, player.points);
    });

    return maxpoints;

}

function gamesMaxPlayerCategory(cat, games) {
    games.sort((first, second) => getMaxPlayerInCategory(second[cat]) - getMaxPlayerInCategory(first[cat]));
    return games;

}


const gamesMaxPlayerActive = _.curry(gamesMaxPlayerCategory)("pos");
const gamesMaxPlayerOnBench = _.curry(gamesMaxPlayerCategory)("bench");


function gamesTotalScore(games) {
    // games = _.uniqBy(games, (g) => g.id)
    games = games.filter(f => f.result.toLowerCase().startsWith('w'))
    games.sort((first, second) => (second.points + second.opponent.points) - (first.points + first.opponent.points))
    return games;
}

function gamesHighestScores(games) {
    // games = _.uniqBy(games, (g) => g.id)
    // games = games.filter(f => f.result.toLowerCase().startsWith('w'))
    games.sort((first, second) => (second.points - first.points))
    return games;
}

function gamesHighestScores(games) {
    // games = _.uniqBy(games, (g) => g.id)
    // games = games.filter(f => f.result.toLowerCase().startsWith('w'))
    games.sort((first, second) => (first.points - second.points))
    return games;
}


function gamesHighestLosingScore(games) {
    games = games.filter(f => f.result.toLowerCase().startsWith('l'))
    games.sort((first, second) => (second.points - first.points))

    return games

}


function gamesLargestVictoryMargin(games) {
    // games = _.uniqBy(games, (g) => g.id)
    games = games.filter(f => f.result.toLowerCase().startsWith('w'))
    games.sort((first, second) => (second.points - second.opponent.points) - (first.points - first.opponent.points))
    return games;
}

function gamesLargestLossMargin(games) {
    // games = _.uniqBy(games, (g) => g.id)
    games = games.filter(f => f.result.toLowerCase().startsWith('l'))
    games.sort((first, second) => (second.opponent.points - second.points) - (first.opponent.points - first.points))
    return games;
}



// function gamesMaxPlayerOnBench(games) {
//     games.sort((first, second) => getMaxPlayerInCategory(second.bench)-getMaxPlayerInCategory(first.bench)  );

// }

function getTopGames(games, number, label, sorter, printer) {

    let label_len = label.length;
    let wrapper_len = 5;
    let header = '*'.repeat(2 * wrapper_len + 2 + label_len);
    let wrapper = '*'.repeat(wrapper_len);
    console.log()
    console.log(header)
    console.log(`${wrapper} ${label} ${wrapper}`);
    console.log(header)
    games = sorter(games);
    games.slice(0, number).forEach(printer);
}


function mapNegativePlayers(games) {
    let count = {}
    let multiple = 0;
    let impacting = [];
    games.forEach(game => {
        let negPlayers = gameHasNegativeScore(game);
        if (negPlayers) {
            if (negPlayers.length > 1) {
                multiple++;
            }
            negPlayers.forEach(p => {
                if (!count[p.position]) {
                    count[p.position] = [];
                }
                count[p.position].push(game);
                if (pointsAffectOutcome(game, p.points)) {
                    impacting.push(game);
                }
            });
        }
    });
    for (const [pos, games] of Object.entries(count)) {
        console.log(`${pos}: ${games.length}`);
        if (pos == "QB") {
            games.forEach(g => printGame(g));
        }
    }
    console.log(`Multiple games: ${multiple}`);

    console.log(impacting.length)
    impacting.forEach(g => printGame(g));
    // console.log(count);
}




async function run() {
    // let years = ["2018", "2019", "2020", "2021"];

    let ffgames = await loadYearsFF(_.range(2006, 2016));
    let yahoogames = await loadYearsYahoo(_.range(2018, 2025));

    let games = [...yahoogames, ...ffgames]

    // loadmatchups("data/2018/matchups", games);
    // loadmatchups("data/2019/matchups", games);
    // loadmatchups("data/2020/matchups", games);
    // loadmatchups("data/2021/matchups", games);

    //fs.writeFileSync('league2010.json', JSON.stringify(leagueData[2020]));


    console.log(games.length);




    // printGame(getMaxDefK(games), leagueData);
    // getTopDefK(games);

    // games.slice(0,5).forEach(g => printGame(g, leagueData));

    // let it = genGameIterator(games[0]);
    // for (i of it) {
    //     console.log(i);
    // }


    // let negGames = findNegGames(games);
    //console.log(negGames.length)

    // mapNegativePlayers(games);

    getTopGames(games, 5, "Top Player On Bench", gamesMaxPlayerOnBench, printFull);
    getTopGames(games, 5, "Top Player Active", gamesMaxPlayerActive, printFull);
    getTopGames(games, 10, "Top Total Scores", gamesTotalScore, printBrief);
    getTopGames(games, 10, "Highest Losing Scores", gamesHighestLosingScore, printBrief);
    getTopGames(games, 10, "Highest Scores", gamesHighestScores, printBrief);
    getTopGames(games, 20, "Largest Victory Margin", gamesLargestVictoryMargin, printBrief);
    // getTopGames(games, 20, "Largest Loss Margin", gamesLargestLossMargin, printFull);
    getTopGames(games, 10, "Lowest Scores", gamesHighestScores, printFull);




    //  negGames.forEach(g=>printGame(g, leagueData))



}


run();
