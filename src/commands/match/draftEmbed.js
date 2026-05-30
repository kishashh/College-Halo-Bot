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

    embed.addFields(
        {
            name: "Teams",
            value:
                `**Team A:** ${session.teamA.name} - <@${session.teamA.id}>\n` +
                `**Team B:** ${session.teamB.name} - <@${session.teamB.id}>`
        },
        {
            name: "Initial Bans",
            value: session.bans.length
                ? session.bans
                    .map((ban, i) => `**Team ${i === 0 ? "A" : "B"}:** ${ban.mode} - ${ban.map}`)
                    .join("\n")
                : "None yet"
        }
    );

    const gamesText = rules.slots.map((slot, i) => {
        const pick = session.picks[i];
        const picker = rules.pickOrder[i];
        if (pick) {
            return `**Game ${i + 1} (${slot}) — Team ${picker}:** ${pick.mode} - ${pick.map}`;
        }
        return `**Game ${i + 1} (${slot}) — Team ${picker}:** Not picked`;
    }).join("\n");

    embed.addFields({ name: "Series", value: gamesText });

    if (session.extraMapBans.length) {
        embed.addFields({
            name: "Team B's Game 7 Map Ban",
            value: session.extraMapBans.join(", ")
        });
    }

    if (session.phase === "complete") {
        embed.setDescription("✅ Draft complete.");
    }

    return embed;
}

// Separate async function for when the draft is complete — sends the graphic
async function sendDraftCompleteEmbed(interaction, session) {
    const rules = SERIES_RULES[session.seriesLength];

    // Map session data into the format renderSeriesGraphic expects
    const games = rules.slots.map((slot, i) => {
        const pick = session.picks[i];
        const picker = rules.pickOrder[i]; // "A" or "B"
        return {
            map: pick?.map ?? "TBD",
            mode: pick?.mode ?? slot,
            pickedBy: picker,
        };
    });

    // session.bans is [{ map, mode }, { map, mode }] — first is Team A, second is Team B
    const teamABans = session.bans
        .filter((_, i) => i % 2 === 0)
        .map(b => ({ map: b.map, mode: b.mode }));
    const teamBBans = session.bans
        .filter((_, i) => i % 2 !== 0)
        .map(b => ({ map: b.map, mode: b.mode }));

    const buffer = await renderSeriesGraphic({
        teamA: session.teamA.name,
        teamB: session.teamB.name,
        bestOf: session.seriesLength,
        games,
        teamABans,
        teamBBans,
    });

    const file = new AttachmentBuilder(buffer, { name: 'series.png' });

    const embed = new EmbedBuilder()
        .setTitle(`✅ Draft Complete`)
        .setDescription(
            `**${session.teamA.name}** <@${session.teamA.id}> vs ` +
            `**${session.teamB.name}** <@${session.teamB.id}>`
        )
        .setImage('attachment://series.png')
        .setColor(0x00EEEE);

    await interaction.editReply({ embeds: [embed], files: [file] });
}

module.exports = {
    buildDraftEmbed,
    sendDraftCompleteEmbed,
};