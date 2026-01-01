from requests import get, post
import json
import webbrowser
import base64
# import os.path
# from os import path
import os
import untangle
import json


# Thanks to https://joinative.com/yahoo-gemini-api-oauth-authentication-python


# https://yahoo-fantasy-node-docs.vercel.app/resource/league/players


# client_id = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXX'
# client_secret = 'YYYYYYYYYYYYYYYYYYY'

client_id = 'dj0yJmk9dFJZQlJpNnJHVnZmJnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTJl'
client_secret = '62797f3a7cda8cee612c0c5d92aeb479c95c7ea0'


def trigger_agreement_url():
    base_url = 'https://api.login.yahoo.com/'

    code_url = f'oauth2/request_auth?client_id={client_id}&redirect_uri=oob&response_type=code&language=en-us'

    # webbrowser.open(base_url + code_url)
    print(base_url + code_url)


def call_auth(grant_type, refresh_token):
    base_url = 'https://api.login.yahoo.com/'

    code = 'e3padka'

    encoded = base64.b64encode(
        (client_id + ':' + client_secret).encode("utf-8"))
    headers = {
        'Authorization': f'Basic {encoded.decode("utf-8")}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    data = {
        'grant_type': grant_type,
        'redirect_uri': 'oob',
        'code': code
    }

    if refresh_token:
        data['refresh_token'] = refresh_token

    return post(base_url + 'oauth2/get_token', headers=headers, data=data)


def write_refresh(token):
    with open('refresh.txt', 'w') as f:
        print(token, file=f)


def read_refresh(filename):
    if os.path.exists(filename):
        print('Reading refresh token')
        with open("refresh.txt", "r") as f:
            refresh_token = f.readline()
        return refresh_token
    else:
        return None


def get_refresh():
    print('Getting a refresh token')
    response = call_auth('authorization_code', None)
    if (response.ok):
        refresh_token = response.json()['refresh_token']
        write_refresh(refresh_token)

        return refresh_token
    else:
        print("Unable to get refresh token")
        return None


def get_access(refresh_token):
    print('Getting an access token')
    response = call_auth('refresh_token', refresh_token)
    if (response.ok):
        access_token = response.json()['access_token']
        return access_token
    else:
        print("Unable to get access token")
        return None


def auth():
    refresh_token = read_refresh('refresh.txt')
    if not refresh_token:
        refresh_token = get_refresh()

    access_token = get_access(refresh_token)

    return access_token


def ensure_dir(dir):
    if not os.path.isdir(dir):
        os.makedirs(dir)


def gen_dir(reqInfo, subdir):
    sub = f"{reqInfo['datadir']}/{subdir}"
    ensure_dir(sub)
    return sub


def make_req(url, access_token):
    print(f"Fetching {url}")

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    ret = "ERROR"

    response = get(url, headers=headers)
    if (response.ok):
        ret = response.text
    else:
        print("ERROR")

    return ret


def make_req_and_dump(url, access_token, filename):

    ret = make_req(url, access_token)
    if not ret == "ERROR":
        print(f"Writing response to {filename}")
        with open(filename, 'w') as f:
            print(ret, file=f)

    return ret


# code_url = f'oauth2/request_auth?client_id={client_id}&redirect_uri=oob&response_type=code&language=en-us'


# u = base_url + code_url
# print(u)
# webbrowser.open()

# code = '2gfe9x7'

# u = 'https://fantasysports.yahooapis.com/fantasy/v2/game/nfl'


def enrich_with_stats(players, stats):
    playerlist = stats.fantasy_content.league.players.player
    for p in playerlist:
        key = p.player_key.cdata

        player = [i for i in players if i["key"] == key][0]
        player["points"] = p.player_points.total.cdata


def parse_week_players(rosterobj):
    players = []
    playerlist = rosterobj.fantasy_content.team.roster.players.player
    for p in playerlist:
        player = {}
        player["name"] = p.name.full.cdata
        player["key"] = p.player_key.cdata
        player["position"] = p.selected_position.position.cdata
        player["primary_position"] = p.primary_position.cdata
        players.append(player)

    return players


def get_team_weekbreakdown(reqInfo, week, teamnum):
    team_roster = make_req_and_dump(f"{reqInfo['baseteamurl']}.t.{teamnum}/roster;week={week}",
                                    reqInfo["tok"], f"{gen_dir(reqInfo, 'rosters')}/week{week}_{teamnum}_roster.xml")

    roster_obj = untangle.parse(team_roster)
    players = parse_week_players(roster_obj)
    playerids = ','.join([p["key"] for p in players])

    stats_xml = make_req_and_dump(f"{reqInfo['baseurl']}/players;player_keys={playerids}/stats;type=week;week={week}",
                                  reqInfo["tok"], f"{gen_dir(reqInfo, 'week_stats')}/week{week}_{teamnum}_playerstats.xml")
    stats_obj = untangle.parse(stats_xml)
    # sentence.replace(" ", "")

    enrich_with_stats(players, stats_obj)

    return players


def get_team_game_rec(reqInfo, week, team):
    team_id = team.team_id.cdata
    players = get_team_weekbreakdown(reqInfo, week, team_id)
    return {
        "teamnum": team_id,
        "players": players,
        "points": team.team_points.total.cdata,
        "projected": team.team_projected_points.total.cdata,
    }


def process_week(reqInfo, week):
    weekurl = f"{reqInfo['baseurl']}/scoreboard;week={week}"

    filename = f"{gen_dir(reqInfo, 'weeks')}/week{week}.xml"
    resp = make_req_and_dump(weekurl, reqInfo['tok'], filename)

    weekobj = untangle.parse(resp)

    week_rec = {
        "year": reqInfo["year"],
        "week": week,
        "games": [],
    }

    matchups = weekobj.fantasy_content.league.scoreboard.matchups.matchup
    for m in matchups:
        teams = m.teams.team
        game = {
            "team1": get_team_game_rec(reqInfo, week, teams[0]),
            "team2": get_team_game_rec(reqInfo, week, teams[1]),
        }
        week_rec["games"].append(game)

    with open(f"{gen_dir(reqInfo, 'matchups')}/week{week}_matchups.json", 'w') as f:
        json.dump(week_rec, f, indent=4)


def downloadyear(reqInfo):
    print(f"Downloading {reqInfo['year']}")
    ensure_dir(reqInfo["datadir"])

    allurl = f"{reqInfo['baseurl']};out=metadata,settings,standings,scoreboard,teams,players,draftresults,transactions"
    leaguedata = make_req_and_dump(
        allurl, reqInfo["tok"], f"{reqInfo['datadir']}/{reqInfo['year']}.xml")
    leagueobj = untangle.parse(leaguedata)
    numteams = int(leagueobj.fantasy_content.league.num_teams.cdata)

    for i in range(reqInfo["startweek"], reqInfo["games"]):
        # for i in range(11,12):
        process_week(reqInfo, i+1)


def run_leagues(tok, league_ids, data_dir):

    for year, rec in league_ids.items():
        reqInfo = {
            "tok": tok,
            "baseurl": f'https://fantasysports.yahooapis.com/fantasy/v2/league/{rec["gameid"]}.l.{rec["league"]}',
            "baseteamurl": f'https://fantasysports.yahooapis.com/fantasy/v2/team/{rec["gameid"]}.l.{rec["league"]}',
            "year": year,
            "datadir": f"{data_dir}/{year}",
            "startweek": rec["startweek"],
            "games": rec["games"]
        }
        downloadyear(reqInfo)

    # year = "2021"
    # rec = league_ids["2021"]

    # reqInfo = {
    #     "tok": tok,
    #     "baseurl": f'https://fantasysports.yahooapis.com/fantasy/v2/league/{rec["gameid"]}.l.{rec["league"]}',
    #     "baseteamurl": f'https://fantasysports.yahooapis.com/fantasy/v2/team/{rec["gameid"]}.l.{rec["league"]}',
    #     "year": year,
    #     "datadir": f"data/{year}",
    #     "games": rec["games"]
    # }

    # downloadyear(reqInfo)


tok = auth()

atf_league_ids = {
        # "2018" : {
        #     "league": "1254687",
        #     "gameid": "380",
        #     "games": 16
        # },
        # "2019" : {
        #     "league": "601189",
        #     "gameid": "390",
        #     "games": 16
        # },
        # "2020" : {
        #     "league": "651421",
        #     "gameid": "399",
        #     "games": 16
        # },
        # "2021" : {
        #     "league": "735140",
        #     "gameid": "406",
        #     "startweek" : 14,
        #     "games": 16
        # },
        # "2022" : {
        #     "league": "529616",
        #     "gameid": "414",
        #     "startweek" : 0,
        #     "games": 17
        # },
        # "2023": {
        #     "league": "604473",
        #     "gameid": "423",
        #     "startweek": 0,
        #     "games": 17
        # },

        # "2024": {
        #     "league": "380312",
        #     "gameid": "449",
        #     "startweek": 11,
        #     "games": 14
        # },
        "2025": {
            "league": "742133",
            "gameid": "461",
            "startweek": 14,
            "games":17 
        }
}

tgm_league_ids = {
        # "2024": {
        #     "league": "240118",
        #     "gameid": "449",
        #     "startweek": 11,  
        #     "games": 15, 
        # },
        "2025": {
            "league": "313501",
            "gameid": "461",
            "startweek": 14,  
            "games":17 
        }
}

run_leagues(tok, atf_league_ids, "data")
run_leagues(tok, tgm_league_ids, "datatgm")


# make_req_and_dump("https://fantasysports.yahooapis.com/fantasy/v2/team/399.l.651421.t.8/roster;week=6", tok, "roster6.xml")

# make_req_and_dump("https://fantasysports.yahooapis.com/fantasy/v2/league/406.l.735140.t.1/roster;week=1", tok, "roster1.xml")

# get_scores(tok, 10)

# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/team/406.l.735140.t.7/matchups", tok, "out.xml")
# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/team/406.l.735140.t.7/stats;type=week;week=1", tok, "out.xml")
# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/team/406.l.735140.t.7/roster;week=1", tok, "roster2.xml")

# obj = untangle.parse("roster.xml")
# get_week_details(obj)


# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/league/406.l.735140/players;player_keys=406.p.25812,406.p.31883/stats;type=week;week=1", tok, "playerstats.xml")
# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/league/406.l.735140/players;player_keys=406.p.25812,406.p.31883;week=2/stats;week=2", tok, "outweek2.xml")
# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/league/406.l.735140/players;player_keys=406.p.25812,406.p.31883/stats;", tok, "outnoweek.xml")


# to get nfl current code
# make_req_and_dump( "https://fantasysports.yahooapis.com/fantasy/v2/game/nfl", tok, "resp.xml")

# make_req_and_dump(f"https://fantasysports.yahooapis.com/fantasy/v2/team/406.l.735140.t.7/stats", tok, "data/pb.xml")
