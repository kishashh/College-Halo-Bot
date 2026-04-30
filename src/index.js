require('dotenv').config();

const { Client, IntentsBitField } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

const client = new Client({ 
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

client.on('ready', (c) => {
    console.log(`✅ ${c.user.tag} is online.`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (message.content === 'hello') {
        message.reply('Hello there!');
    }
});

client.login(token);

