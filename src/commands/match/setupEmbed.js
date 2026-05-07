const { EmbedBuilder } = require('discord.js');

function buildSetupEmbed(session) {

    return new EmbedBuilder()
        .setTitle('🏆 League Match Setup')
        .setDescription('Configure your match.')
        .setColor(0x00EEEE);
}

module.exports = {
    buildSetupEmbed
};