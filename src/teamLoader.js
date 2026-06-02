const fs   = require('fs');
const path = require('path');

const TEAMS_PATH = process.env.TEAMS_PATH 
    || path.join(__dirname, './data/teams.json');

function getTeams() {
    const raw = fs.readFileSync(TEAMS_PATH, 'utf-8');
    return JSON.parse(raw);
}

function saveTeams(teams) {
    fs.writeFileSync(TEAMS_PATH, JSON.stringify(teams, null, 4), 'utf-8');
}

module.exports = { getTeams, saveTeams, TEAMS_PATH };