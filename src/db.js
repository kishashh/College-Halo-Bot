const { MongoClient } = require('mongodb');

let db = null;

async function connectDB() {
    if (db) return db;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('chalo0');
    console.log('✅ Connected to MongoDB');
    return db;
}

async function getDB() {
    if (!db) await connectDB();
    return db;
}

module.exports = { connectDB, getDB };