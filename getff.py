import json
import os
from requests import get, post



STANDINGURL="https://www.fleaflicker.com/api/FetchLeagueStandings?league_id=38603"
SCOREBOARDURL="https://www.fleaflicker.com/api/FetchLeagueScoreboard?league_id=38603"
BOXSCOREURL="https://www.fleaflicker.com/api/FetchLeagueBoxscore?league_id=38603"

def make_req(url):
    print(f"Fetching {url}")

    headers = {
        # 'Authorization': f'Bearer {access_token}',
        # 'Accept': 'application/json',
        # 'Content-Type': 'application/json'
    }
    ret = "ERROR"

    response = get(url, headers=headers)
    if (response.ok):
        ret = response.text
    else:
        print("ERROR")

    return ret


def make_req_and_dump(url, filename):

    ret = make_req(url)
    if not ret=="ERROR":
        print(f"Writing response to {filename}")
        with open(filename, 'w') as f:
            print(ret, file=f)

    return json.loads(ret)

def ensure_dir(dir):
    if not os.path.isdir(dir):
        os.makedirs(dir)

def gen_dir(datadir, subdir):
    sub = f"{datadir}/{subdir}"
    ensure_dir(sub)
    return sub

def get_standings(year, datadir):
    url = f'{STANDINGURL}&season={year}'
    ensure_dir(datadir)
    f = f'{datadir}/{year}_standings.json'
    return make_req_and_dump(url, f)


def get_scoreboard(year, week, data_dir):
    print(f'Year: {year} Week: {week}')

    sub = gen_dir(data_dir, "scoreboard")
    url = f'{SCOREBOARDURL}&season={year}&scoring_period={week}'
    f = f'{sub}/scoreboard_{week}.json'
    scoreboard =  make_req_and_dump(url, f)
    for game in scoreboard["games"]:
        get_boxscore(week, game["id"], data_dir)

    

def get_boxscore(week, gameid, data_dir):
    sub = gen_dir(data_dir, "boxscores")
    url = f'{BOXSCOREURL}&fantasy_game_id={gameid}'
    f = f'{sub}/box_{week}_{gameid}.json'
    make_req_and_dump(url, f)

def count_game_segment(seg):
    return seg.get("wins", 0)+seg.get("losses", 0)
        

def count_games(standings):
    m = 0
    for team in standings["divisions"][0]["teams"]:
        #print(team["name"])
        regseason = count_game_segment(team["recordOverall"])
        playoff = count_game_segment(team["recordPostseason"])
        m = max(m, playoff+regseason)

    return m



def process_year(year):
    data_dir = f'data/{year}'
    standings = get_standings(year, data_dir)
    games = count_games(standings)    
    for w in range(games):
        get_scoreboard(year, w+1, data_dir)


leagueid = "38603"
# for year in  range(2006, 2016):
#     process_year(year) 
process_year(2015)

#get_standings(2015)
#get_scoreboard(2015, 1)
#get_boxscore(2015, 1, 30916674)
#make_req_and_dump("https://www.fleaflicker.com/api/FetchLeagueActivity?league_id=38603", "ff.json")