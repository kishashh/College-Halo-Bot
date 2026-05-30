const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateSeries } = require('./utils/seriesGenerator');
const { renderSeriesGraphic } = require('./utils/renderSeriesGraphic');

async function execute(interaction) {
    await interaction.deferReply();

    const rawGames = generateSeries(7);
    const games = rawGames.map((g, i) => ({
        map: g.generatedMap,
        mode: g.generatedMode,
        pickedBy: i % 2 === 0 ? "A" : "B"
    }));

    const buffer = await renderSeriesGraphic({
        teamA: "Eagle",
        teamB: "Cobra",
        bestOf: 7,
        teamAColor: "#d84141",
        teamBColor: "#49b8fe",
        games,
        teamABans: [],
        teamBBans: [],
    });

    const file = new AttachmentBuilder(buffer, { name: 'series.png' });
    const embed = new EmbedBuilder()
        .setTitle('🎮 BO7 Series')
        .setDescription('Randomly generated BO7')
        .setColor(0x00EEEE)
        .setImage('attachment://series.png');

    await interaction.editReply({ embeds: [embed], files: [file] });
}

module.exports = { execute };