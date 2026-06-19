const { getDB } = require('./db');

// ── Get all teams from MongoDB ─────────────────────────────────────────────
async function getTeams() {
    const db = await getDB();
    return await db.collection('teams').find({}).toArray();
}

// ── Add or update a single team ────────────────────────────────────────────
async function saveTeam(team) {
    const db = await getDB();
    await db.collection('teams').replaceOne(
        { label: team.label },
        team,
        { upsert: true }
    );
}

// ── Delete a team by label ─────────────────────────────────────────────────
async function deleteTeam(label) {
    const db = await getDB();
    const result = await db.collection('teams').deleteOne({ label });
    return result.deletedCount > 0;
}

// ── Find a single team by label ────────────────────────────────────────────
async function getTeam(label) {
    const db = await getDB();
    return await db.collection('teams').findOne({ label });
}

module.exports = { getTeams, saveTeam, deleteTeam, getTeam };