require('dotenv').config();

const { Client, IntentsBitField } = require('discord.js');
const { connectDB } = require('./db');
const { restoreSessions } = require('./sessionManager');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds
    ]
});

require('./events/ready')(client);
require('./events/interactionCreate')(client);

async function start() {
    // Connect to MongoDB first
    await connectDB();

    // Restore any in-progress sessions
    await restoreSessions();

    // Log in to Discord
    await client.login(process.env.DISCORD_TOKEN);
}

start().catch(err => {
    console.error('Failed to start bot:', err);
    process.exit(1);
});