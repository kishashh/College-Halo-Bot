const { getDB } = require('./db');

// In-memory cache — still used for fast lookups during active interactions
const matchSessions = new Map();

// ── Persist session to MongoDB ─────────────────────────────────────────────
async function saveSession(messageId, session) {
    try {
        // console.log('Saving session:', messageId);
        const db = await getDB();
        await db.collection('sessions').replaceOne(
            { messageId },
            { messageId, ...session, updatedAt: new Date() },
            { upsert: true }
        );
        // console.log('Session saved successfully');
    } catch (err) {
        console.error('Failed to save session:', err);
    }
}

// ── Delete session from MongoDB ────────────────────────────────────────────
async function deleteSession(messageId) {
    try {
        const db = await getDB();
        await db.collection('sessions').deleteOne({ messageId });
    } catch (err) {
        console.error('Failed to delete session:', err);
    }
}

// ── Load all active sessions from MongoDB on startup ──────────────────────
async function restoreSessions() {
    try {
        const db = await getDB();
        const sessions = await db.collection('sessions').find({}).toArray();

        for (const session of sessions) {
            const { messageId, _id, ...data } = session;
            matchSessions.set(messageId, data);
        }

        console.log(`✅ Restored ${sessions.length} active session(s) from database`);
    } catch (err) {
        console.error('Failed to restore sessions:', err);
    }
}

// ── Wrapped Map that auto-saves to MongoDB ─────────────────────────────────
const persistentSessions = {
    get(messageId) {
        return matchSessions.get(messageId);
    },

    set(messageId, session) {
        console.log('persistentSessions.set called:', messageId);
        matchSessions.set(messageId, session);
        saveSession(messageId, session);
        return this;
    },

    delete(messageId) {
        matchSessions.delete(messageId);
        deleteSession(messageId); // fire and forget
        return this;
    },

    has(messageId) {
        return matchSessions.has(messageId);
    },

    values() {
        return matchSessions.values();
    },

    entries() {
        return matchSessions.entries();
    },

    get size() {
        return matchSessions.size;
    }
};

module.exports = { matchSessions: persistentSessions, restoreSessions };
