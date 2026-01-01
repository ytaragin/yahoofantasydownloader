const fs = require('fs');
const readline = require('readline');
const { runFlow, transformToSheet } = require('./gendata');
const { run } = require('googleapis/build/src/apis/run');


function writeToCsv(filename, data) {
    const csvContent = data.map(row => row.join(',')).join('\n');
    fs.writeFileSync(filename, csvContent);
}

async function getAndStore(datadir, year) {
    const outfile = `${datadir}/${year}/powerranks`;

    const data = await runFlow(datadir, year);
    // console.log(data)
    let { scores, projected } = await transformToSheet(data);

    // console.log(scores);

    writeToCsv(`${outfile}.csv`, scores);
    writeToCsv(`${outfile}_projected.csv`, projected);


}


async function run_local() {
    await getAndStore("data", 2025);
    await getAndStore("datatgm", 2025);
}



run_local();  