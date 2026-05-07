require('dotenv').config();

const { Client, IntentsBitField } = require('discord.js');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds
    ]
});

require('./events/ready')(client);
require('./events/interactionCreate')(client);

client.login(process.env.DISCORD_TOKEN);