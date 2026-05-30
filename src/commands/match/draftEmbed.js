const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getDraftPrompt } = require('./draftLogic');
const SERIES_RULES = require('../../data/seriesRules');
const { renderSeriesGraphic } = require('../utils/renderSeriesGraphic');

function buildDraftEmbed(session) {
    const rules = SERIES_RULES[session.seriesLength];

    const embed = new EmbedBuilder()
        .setTitle(`🎮 BO${session.seriesLength} Calculated Draft`)
        .setDescription(getDraftPrompt(session))
        .setColor(0x00EEEE);

    const gamesText = rules.slots.map((slot, i) => {
        const pick = session.picks[i];
        const picker = rules.pickOrder[i];

        // if (pick) {
        //     return `**Game ${i + 1} (${slot}) — Team ${picker}:** ${pick.mode} - ${pick.map}`;
        // }

        // return `**Game ${i + 1} (${slot}) — Team ${picker}:** Not picked`;
    }).join("\n");

    embed.addFields({
        name: "Series",
        value: gamesText
    });

    if (session.phase === "complete") {
        embed.setDescription("✅ Draft complete.");
    }

    return embed;
}

async function sendDraftGraphicEmbed(interaction, session) {

    const rules = SERIES_RULES[session.seriesLength];

    const games = rules.slots.map((slot, i) => {

        const pick = session.picks[i];
        const picker = rules.pickOrder[i];

        if (!pick) return null;

        return {
            map: pick.map,
            mode: pick.mode,
            pickedBy: picker,
        };
    });

    const teamABans = session.bans
        .filter((_, i) => i % 2 === 0)
        .map(b => ({
            map: b.map,
            mode: b.mode
        }));

    const teamBBans = [
        ...session.bans
            .filter((_, i) => i % 2 !== 0)
            .map(b => ({
                map: b.map,
                mode: b.mode
            })),

        ...session.extraMapBans.map(map => ({
            map,
            mode: "Slayer"
        }))
    ];

    const buffer = await renderSeriesGraphic({
        teamA: session.teamA.name,
        teamB: session.teamB.name,
        bestOf: session.seriesLength,
        games,
        teamABans,
        teamBBans,
    });

    const file = new AttachmentBuilder(buffer, {
        name: 'series.png'
    });

    const embed = new EmbedBuilder()
        .setTitle(`✅ Draft Complete`)
        .setDescription(
            `**${session.teamA.name}** <@${session.teamA.id}> vs ` +
            `**${session.teamB.name}** <@${session.teamB.id}>`
        )
        .setImage('attachment://series.png')
        .setColor(0x00EEEE);

    await interaction.editReply({
        embeds: [embed],
        files: [file]
    });
}

async function buildDraftGraphic(session) {

    const rules = SERIES_RULES[session.seriesLength];

    const games = rules.slots.map((slot, i) => {

        const pick = session.picks[i];
        const picker = rules.pickOrder[i];

        if (!pick) return null;

        return {
            map: pick.map,
            mode: pick.mode,
            pickedBy: picker,
        };
    });

    const teamABans = session.bans
        .filter((_, i) => i % 2 === 0)
        .map(b => ({
            map: b.map,
            mode: b.mode
        }));

    const teamBBans = [
        ...session.bans
            .filter((_, i) => i % 2 !== 0)
            .map(b => ({
                map: b.map,
                mode: b.mode
            })),

        ...session.extraMapBans.map(map => ({
            map,
            mode: "Slayer"
        }))
    ];

    const buffer = await renderSeriesGraphic({
        teamA: session.teamA.name,
        teamB: session.teamB.name,
        bestOf: session.seriesLength,
        games,
        teamABans,
        teamBBans,
    });

    return new AttachmentBuilder(buffer, {
        name: "series.png"
    });
}

module.exports = {
    buildDraftEmbed,
    sendDraftGraphicEmbed,
    buildDraftGraphic
};