const { EmbedBuilder } = require('discord.js');

const {
    getDraftPrompt
} = require('./draftLogic');

const SERIES_RULES = require('../../data/seriesRules');

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

    embed.addFields({
        name: "Series",
        value: gamesText
    });

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

module.exports = {
    buildDraftEmbed
};