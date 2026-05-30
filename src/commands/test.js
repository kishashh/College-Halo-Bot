const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { renderSeriesGraphic } = require('./utils/renderSeriesGraphic');

async function execute(interaction) {
    await interaction.deferReply();

    const buffer = await renderSeriesGraphic({
        teamA: "UCF",
        teamB: "UNA",
        bestOf: 5,
        games: [
            { map: "Origin",    mode: "CTF",        pickedBy: "A" },
            { map: "Live Fire", mode: "Slayer",      pickedBy: "A" },
            { map: "Lattice",   mode: "Oddball",     pickedBy: "B" },
            { map: "Recharge",  mode: "KOTH",        pickedBy: "A" },
            { map: "Aquarius",  mode: "Slayer",      pickedBy: "B" },
            { map: "Recharge",  mode: "KOTH",        pickedBy: "B" },
            { map: "Aquarius",  mode: "Slayer",      pickedBy: "A" },
        ],
        teamABans: [{ map: "Forbidden", mode: "CTF" }],
        teamBBans: [
            { map: "Fortress", mode: "CTF" },
            { map: "Fortress", mode: "Slayer" },
        ],
    });

    const file = new AttachmentBuilder(buffer, { name: 'series.png' });
    const embed = new EmbedBuilder()
        .setImage('attachment://series.png')
        .setColor(0x0b0d14);

    await interaction.editReply({ embeds: [embed], files: [file] });
}

module.exports = { execute };
