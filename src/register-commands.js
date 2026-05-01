require('dotenv').config();
const { REST, Routes } = require('discord.js'); 

const commands = [
    {
        name: 'hey',
        description: 'Replys with hey!'
    },
    {
        name: 'bo3',
        description: 'Outputs a random best of 3 series.'
    },
    {
        name: 'bo5',
        description: 'Outputs a random best of 5 series.'
    },
    {
        name: 'bo7',
        description: 'Outputs a random best of 7 series.'
    },
    {
        name: 'match',
        description: 'Admin command to initialize the match picking process for league matches.',
        default_member_permissions: "8" // ADMINISTRATOR
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        )

        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.log(`There was an error: ${error}`);
    }
})();