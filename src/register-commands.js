require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('hey')
        .setDescription('Replies with Hey!'),

    new SlashCommandBuilder()
        .setName('bo3')
        .setDescription('Generates a random BO3 series'),

    new SlashCommandBuilder()
        .setName('bo5')
        .setDescription('Generates a random BO5 series'),

    new SlashCommandBuilder()
        .setName('bo7')
        .setDescription('Generates a random BO7 series'),

    new SlashCommandBuilder()
        .setName('match')
        .setDescription('Creates a league match draft')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const guildIds = process.env.GUILD_IDS
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

console.log("Guild IDs:", guildIds);

(async () => {
    try {
        for (const guildId of guildIds) {
            console.log(`Registering commands for guild ${guildId}...`);

            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    guildId
                ),
                { body: commands }
            );

            console.log(`✅ Registered commands for guild ${guildId}`);
        }

        console.log('✅ Slash commands registered.');
    } catch (error) {
        console.error(error);
    }
})();