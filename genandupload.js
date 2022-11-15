/**
 * @license
 * Copyright Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START sheets_quickstart]
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { runFlow } = require('./gendata');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), writeData); //listMajors);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
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

function uploadFile(auth, spreadsheetId, values, range, valueInputOption) {
  // const spreadsheetId = '1xWI0LE2ePaBf-zRzZSYhEttARLrhEhZGFldp5inSZIE';
  const sheets = google.sheets({ version: 'v4', auth });

  const resource = {
    values,
  };

  sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption,
    resource,
  }, (err, result) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      console.log(`Result:`, result.updatedCells);
    }
  });

}
async function writeData(auth) {
  let teams = await runFlow(2022, 10);
  let { scores, projected } = transformToSheet(teams);

  const spreadsheetId2020 = '1d2H3ZjtjHVvGKirBBX7wKspjXXI8znp7_QOKxgxv4fQ';
  const spreadsheetId2021 = '19uapsMoF_ihR8hRUKcDWPbZizEE5Cj97fYaFPyM4Yw8';
  const spreadsheetId2022 = '1A6AFKgjx4ehUukod-NMwAtKnuY7pTcjN0em9zhQ9N1M';
  uploadFile(auth, spreadsheetId2022, scores, "Scores!A1:Q13", "USER_ENTERED")
  uploadFile(auth, spreadsheetId2022, projected, "Projected!A1:Q13", "USER_ENTERED")


}

// [END sheets_quickstart]

module.exports = {
  SCOPES,
  listMajors,
};
