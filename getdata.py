from requests import get, post
import json
import webbrowser
import base64
import os.path
from os import path


# Thanks to https://joinative.com/yahoo-gemini-api-oauth-authentication-python

def call_auth(grant_type, refresh_token):
    client_id = 'dj0yJmk9Q1IyMTV6U1ljdzhJJmQ9WVdrOVVVZEdXWGRrUlhFbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PWU5'
    client_secret = '2f150020e0a1c467d83e9634dc15914378521cfc'
    base_url = 'https://api.login.yahoo.com/'

    code = 'e3padka'

    encoded = base64.b64encode((client_id + ':' + client_secret).encode("utf-8"))
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
    if path.exists(filename):
        print('Reading refresh token')
        f = open("refresh.txt", "r")
        refresh_token = f.readline()
        f.close()
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


def make_req_and_dump(url, access_token, filename):
    print(f"Fetching {url}")

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }

    response = get(url, headers=headers)
    if (response.ok):
        #return response.json()['response']
        print(f"Writing response to {filename}")
        with open(filename, 'w') as f:
            print(response.text, file=f)
    else:
        print("ERROR")





#code_url = f'oauth2/request_auth?client_id={client_id}&redirect_uri=oob&response_type=code&language=en-us'


#u = base_url + code_url
#print(u)
# webbrowser.open()

# code = '2gfe9x7'

#u = 'https://fantasysports.yahooapis.com/fantasy/v2/game/nfl'

def get_scores(tok, weeks):
    u = 'https://fantasysports.yahooapis.com/fantasy/v2/league/399.l.651421/scoreboard;week='


    for i in range(weeks):
        url = f"{u}{i+1}"
        filename = f"data/week{i+1}.xml"
        resp = make_req_and_dump(url, tok, filename)




allurl = "https://fantasysports.yahooapis.com/fantasy/v2/league/399.l.651421;out=metadata,settings,standings,scoreboard,teams,players,draftresults,transactions"
tok = auth()
make_req_and_dump(allurl, tok, "data/all.xml")
get_scores(tok, 13)
