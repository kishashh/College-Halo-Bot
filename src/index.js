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

client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(interaction.commandName);
    if (interaction.commandName === 'hey') {
        interaction.reply('Hey!');
    }

    if (interaction.commandName === 'bo5') {
        interaction.reply('Here is a random best of 5 series!');
    }
});

client.login(token);

