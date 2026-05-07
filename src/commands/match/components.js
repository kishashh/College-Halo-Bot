const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

function buildSetupComponents() {

    const button = new ButtonBuilder()
        .setCustomId('submit_match')
        .setLabel('Submit Match')
        .setStyle(ButtonStyle.Success);

    return [
        new ActionRowBuilder().addComponents(button)
    ];
}

module.exports = {
    buildSetupComponents
};