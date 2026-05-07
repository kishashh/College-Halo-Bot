const {
    EmbedBuilder
} = require('discord.js');

const {
    generateSeries
} = require('../utils/seriesGenerator');

async function execute(interaction) {

    const games = generateSeries(3);

    const embed = new EmbedBuilder()
        .setTitle('🎮 BO3 Series')
        .setDescription('Randomly generated BO3')
        .setColor(0x00EEEE)
        .setThumbnail(
            'https://static-cdn.jtvnw.net/jtv_user_pictures/2b3fb5fc-ba4b-4d42-baae-852eb79d89ea-profile_image-70x70.png'
        );

    games.forEach((game, index) => {

        embed.addFields({
            name: `Game ${index + 1}`,
            value: `${game.mode} - ${game.map}`
        });

    });

    return interaction.reply({
        embeds: [embed]
    });
}

module.exports = {
    execute
};