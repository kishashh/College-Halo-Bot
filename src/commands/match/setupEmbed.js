const { EmbedBuilder } = require('discord.js');

function buildSetupEmbed(session) {

    return new EmbedBuilder()
        .setTitle("🏆 League Match Setup")
        .setDescription(
            [
                "**Admin Match Creation Panel**",
                "",
                "⚠️ Team A is automatically the higher seed.",
                "",
                "1️⃣ Select the Match Type",
                "2️⃣ Select Team A",
                "3️⃣ Select Team B",
                "4️⃣ Select BO5 or BO7",
                "5️⃣ Press Submit Match"
            ].join("\n")
        )
        .addFields(
            {
                name: "Match Type",
                value: session.matchType
                    ? session.matchType
                    : "Not Selected",
                inline: true
            },
            {
                name: "Team A",
                value: session.teamA
                    ? `${session.teamA.name} - <@${session.teamA.id}>`
                    : "Higher Seed (Not Selected)",
                inline: true
            },
            {
                name: "Team B",
                value: session.teamB
                    ? `${session.teamB.name} - <@${session.teamB.id}>`
                    : "Lower Seed (Not Selected)",
                inline: true
            },
            {
                name: "Series",
                value: session.seriesLength
                    ? `BO${session.seriesLength}`
                    : "Not Selected",
                inline: true
            }
        )
        .setColor(0x00EEEE)
        .setFooter({
            text: "League Match System"
        });
}

module.exports = {
    buildSetupEmbed
};