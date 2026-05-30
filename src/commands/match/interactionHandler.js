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
    buildDraftGraphic
} = require('./draftEmbed');

const {
    getCurrentPickerUserId,
    getCurrentPicker
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
            session.teamA = { name: teamName, id: teamId };
            await interaction.deferUpdate();
            return interaction.editReply({
                embeds: [buildSetupEmbed(session)],
                components: buildSetupComponents(session)
            });
        }

        if (interaction.customId === "team_select_b") {
            const [teamName, teamId] = interaction.values[0].split("|");
            session.teamB = { name: teamName, id: teamId };
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

            // Draft complete
            if (session.phase === "complete") {
                const file = await buildDraftGraphic(session);
                const embed = buildDraftEmbed(session)
                    .setDescription("✅ Draft complete.")
                    .setImage("attachment://series.png");

                await interaction.message.delete();

                const channel = interaction.guild.channels.cache.get(session.channelId);
                await channel.send({
                    embeds: [embed],
                    files: [file],
                    components: []
                });

                return;
            }

            // Draft still in progress — delete and resend with ping
            const picker = getCurrentPicker(session);
            const pingId = picker === "A" ? session.teamA.id : session.teamB.id;

            const file = await buildDraftGraphic(session);
            const embed = buildDraftEmbed(session).setImage("attachment://series.png");

            const oldMessageId = interaction.message.id;
            await interaction.message.delete();

            const channel = interaction.guild.channels.cache.get(session.channelId);
            const newMessage = await channel.send({
                content: `<@${pingId}>'s turn.`,
                embeds: [embed],
                files: [file],
                components: buildDraftComponents(session)
            });

            // Update session key to new message ID
            matchSessions.delete(oldMessageId);
            matchSessions.set(newMessage.id, session);

            return;
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

            // Create the private match channel
            const guild = interaction.guild;
            const category = guild.channels.cache.find(
                c => c.name === "Pending Matches" && c.type === 4
            );

            const channel = await guild.channels.create({
                name: `${session.teamA.name.toLowerCase()}-v-${session.teamB.name.toLowerCase()}`,
                type: 0,
                parent: category?.id ?? null,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: ["ViewChannel"]
                    },
                    {
                        id: session.adminId,
                        allow: ["ViewChannel", "SendMessages"]
                    },
                    {
                        id: session.teamA.id,
                        allow: ["ViewChannel", "SendMessages"]
                    },
                    {
                        id: session.teamB.id,
                        allow: ["ViewChannel", "SendMessages"]
                    }
                ]
            });

            session.channelId = channel.id;
            session.phase = "initial_bans";
            session.bans = [];
            session.picks = [];
            session.extraMapBans = [];

            const pingId = session.teamA.id;

            const file = await buildDraftGraphic(session);
            const embed = buildDraftEmbed(session).setImage("attachment://series.png");

            // Send draft into the new channel
            const draftMessage = await channel.send({
                content: `<@${session.teamA.id}> <@${session.teamB.id}>`
            });

            const newMessage = await channel.send({
                content: `<@${pingId}> gets the first ban.`,
                embeds: [embed],
                files: [file],
                components: buildDraftComponents(session)
            });

            // Update session key to new message ID
            matchSessions.delete(interaction.message.id);
            matchSessions.set(draftMessage.id, session);

            // Update original setup message to confirm
            await interaction.deferUpdate();
            return interaction.editReply({
                content: `✅ Match created in ${channel}`,
                embeds: [],
                components: []
            });
        }
    }
}

module.exports = handleComponent;