const {
    matchSessions
} = require('./sessionManager');

const {
    buildSetupEmbed
} = require('./setupEmbed');

const {
    buildSetupComponents,
    buildDraftComponents
} = require('./components');

const {
    buildDraftEmbed,
    sendDraftCompleteEmbed
} = require('./draftEmbed');

const {
    getCurrentPickerUserId
} = require('./draftLogic');

async function handleComponent(interaction) {

    const session = matchSessions.get(interaction.message.id);

    if (!session) {
        return;
    }

    if (interaction.isStringSelectMenu()) {

        if (
            [
                "team_select_a",
                "team_select_b",
                "series_length_select"
            ].includes(interaction.customId)
        ) {
            if (interaction.user.id !== session.adminId) {
                return interaction.reply({
                    content: "❌ Only the admin who created this match can edit setup.",
                    flags: 64
                });
            }
        }

        if (interaction.customId === "team_select_a") {
            const [teamName, teamId] = interaction.values[0].split("|");

            session.teamA = {
                name: teamName,
                id: teamId
            };

            await interaction.deferUpdate();

            return interaction.editReply({
                embeds: [buildSetupEmbed(session)],
                components: buildSetupComponents(session)
            });
        }

        if (interaction.customId === "team_select_b") {
            const [teamName, teamId] = interaction.values[0].split("|");

            session.teamB = {
                name: teamName,
                id: teamId
            };

            await interaction.deferUpdate();

            return interaction.editReply({
                embeds: [buildSetupEmbed(session)],
                components: buildSetupComponents(session)
            });
        }

        if (interaction.customId === "series_length_select") {
            session.seriesLength = Number(interaction.values[0]);

            await interaction.deferUpdate();

            return interaction.editReply({
                embeds: [buildSetupEmbed(session)],
                components: buildSetupComponents(session)
            });
        }

        if (interaction.customId === "draft_select") {
            const allowedUserId = getCurrentPickerUserId(session);

            if (interaction.user.id !== allowedUserId) {
                return interaction.reply({
                    content: "❌ It is not your turn to pick or ban.",
                    flags: 64
                });
            }

            const parts = interaction.values[0].split("|");
            const action = parts[0];

            if (action === "BAN") {
                session.bans.push({
                    mode: parts[1],
                    map: parts[2],
                    type: parts[1] === "Slayer" ? "Slayer" : "OBJ"
                });

                if (session.bans.length >= 2) {
                    session.phase = "picks";
                }
            }

            if (action === "PICK") {
                session.picks.push({
                    mode: parts[1],
                    map: parts[2],
                    type: parts[1] === "Slayer" ? "Slayer" : "OBJ"
                });

                if (
                    session.seriesLength === 7 &&
                    session.picks.length === 6 &&
                    session.extraMapBans.length === 0
                ) {
                    session.phase = "extra_g7_ban";
                } else if (session.picks.length >= session.seriesLength) {
                    session.phase = "complete";
                }
            }

            if (action === "MAPBAN") {
                session.extraMapBans.push(parts[1]);
                session.phase = "picks";
            }

            // Draft complete — send the graphic
            if (session.phase === "complete") {
                await interaction.deferUpdate();

                // Update the original message to show final text embed (no components)
                await interaction.editReply({
                    content: `## ✅ Draft Complete\n${session.teamA.name} vs ${session.teamB.name}`,
                    embeds: [buildDraftEmbed(session)],
                    components: []
                });

                // Send the graphic as a follow-up message
                await sendDraftCompleteEmbed(interaction, session);

                return;
            }

            // Draft still in progress — update embed normally
            await interaction.deferUpdate();

            return interaction.editReply({
                content: null,
                embeds: [buildDraftEmbed(session)],
                components: buildDraftComponents(session)
            });
        }
    }

    if (interaction.isButton()) {

        if (interaction.customId === "submit_match") {
            if (interaction.user.id !== session.adminId) {
                return interaction.reply({
                    content: "❌ Only the admin who created this match can submit it.",
                    flags: 64
                });
            }

            session.phase = "initial_bans";
            session.bans = [];
            session.picks = [];
            session.extraMapBans = [];

            await interaction.deferUpdate();

            return interaction.editReply({
                embeds: [buildDraftEmbed(session)],
                components: buildDraftComponents(session)
            });
        }
    }
}

module.exports = handleComponent;