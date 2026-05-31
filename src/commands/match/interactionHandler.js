const {
    matchSessions
} = require('./sessionManager');

const {
    buildSetupEmbed
} = require('./setupEmbed');

const {
    buildSetupComponents,
    buildScheduleComponents,
    buildScheduleResponseComponents,
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

const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

async function handleComponent(interaction) {

    // ── Modal submit (propose time) ───────────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === "propose_time_modal") {

        const session = [...matchSessions.values()].find(
            s => s.channelId === interaction.channelId
        );

        if (!session) return;

        const dateInput = interaction.fields.getTextInputValue("match_date").trim();
        const timeInput = interaction.fields.getTextInputValue("match_time").trim();
        const tzInput   = interaction.fields.getTextInputValue("match_timezone").toUpperCase().trim();

        let timestamp;
        try {
            const timeRegex = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;
            const timeMatch = timeInput.match(timeRegex);
            if (!timeMatch) throw new Error("Invalid time");

            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const meridiem = timeMatch[3].toLowerCase();

            if (meridiem === "pm" && hours !== 12) hours += 12;
            if (meridiem === "am" && hours === 12) hours = 0;

            const dateParts = dateInput.split("/");
            if (dateParts.length !== 3) throw new Error("Invalid date");

            const month = parseInt(dateParts[0]) - 1;
            const day   = parseInt(dateParts[1]);
            const year  = parseInt(dateParts[2]);

            const tzOffsets = {
                EST: -5, EDT: -4,
                CST: -6, CDT: -5,
                MST: -7, MDT: -6,
                PST: -8, PDT: -7,
                UTC: 0,  GMT: 0
            };

            const offset = tzOffsets[tzInput];
            if (offset === undefined) throw new Error("Unknown timezone");

            const utcMs = Date.UTC(year, month, day, hours - offset, minutes);
            timestamp = Math.floor(utcMs / 1000);

        } catch (e) {
            return interaction.reply({
                content: "❌ Couldn't parse that date/time. Use format: date `5/23/2026`, time `5:30pm`, timezone `EST`",
                flags: 64
            });
        }

        // Delete previous proposal message if exists
        if (session.proposalMessageId) {
            try {
                const chan = interaction.guild.channels.cache.get(session.channelId);
                const oldMsg = await chan.messages.fetch(session.proposalMessageId);
                await oldMsg.delete();
            } catch (_) {}
            session.proposalMessageId = null;
        }

        session.proposedTime = { timestamp, proposedBy: interaction.user.id };

        const proposerTeam = session.teamA.id === interaction.user.id ? "A" : "B";
        const proposerName = proposerTeam === "A" ? session.teamA.name : session.teamB.name;

        const embed = new EmbedBuilder()
            .setTitle("📅 Match Time Proposed")
            .setDescription(
                `**${proposerName}** has proposed a match time:\n\n` +
                `**<t:${timestamp}:F>**\n` +
                `*(<t:${timestamp}:R>)*`
            )
            .setColor(0x00EEEE)
            .setFooter({ text: "Discord automatically shows this in your local timezone." });

        const proposalMsg = await interaction.reply({
            embeds: [embed],
            components: buildScheduleResponseComponents(),
            fetchReply: true
        });

        session.proposalMessageId = proposalMsg.id;

        return;
    }

    // ── Button / Select interactions ──────────────────────────────────────────
    const session = matchSessions.get(interaction.message?.id)
        ?? [...matchSessions.values()].find(s => s.channelId === interaction.channelId);

    if (!session) return;

    // ── Propose time button → open modal ─────────────────────────────────────
    if (interaction.isButton() && interaction.customId === "propose_time") {

        const isPlayer =
            interaction.user.id === session.teamA.id ||
            interaction.user.id === session.teamB.id;

        if (!isPlayer) {
            return interaction.reply({
                content: "❌ Only the two players can propose a time.",
                flags: 64
            });
        }

        const modal = new ModalBuilder()
            .setCustomId("propose_time_modal")
            .setTitle("Propose Match Time");

        const dateInput = new TextInputBuilder()
            .setCustomId("match_date")
            .setLabel("Date (e.g. 5/23/2026)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeInput = new TextInputBuilder()
            .setCustomId("match_time")
            .setLabel("Time (e.g. 5:30pm)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const tzInput = new TextInputBuilder()
            .setCustomId("match_timezone")
            .setLabel("Timezone (EST, CST, MST, PST, UTC)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(timeInput),
            new ActionRowBuilder().addComponents(tzInput)
        );

        return interaction.showModal(modal);
    }

    // ── Accept time button → start draft ─────────────────────────────────────
    if (interaction.isButton() && interaction.customId === "accept_time") {

        if (!session.proposedTime) {
            return interaction.reply({
                content: "❌ No time has been proposed yet.",
                flags: 64
            });
        }

        const proposerId = session.proposedTime.proposedBy;
        if (interaction.user.id === proposerId) {
            return interaction.reply({
                content: "❌ You can't accept your own proposed time.",
                flags: 64
            });
        }

        const isPlayer =
            interaction.user.id === session.teamA.id ||
            interaction.user.id === session.teamB.id;

        if (!isPlayer) {
            return interaction.reply({
                content: "❌ Only the two players can accept a time.",
                flags: 64
            });
        }

        const { timestamp } = session.proposedTime;

        // Delete the proposal message
        if (session.proposalMessageId) {
            try {
                const chan = interaction.guild.channels.cache.get(session.channelId);
                const propMsg = await chan.messages.fetch(session.proposalMessageId);
                await propMsg.delete();
            } catch (_) {}
            session.proposalMessageId = null;
        }

        const confirmEmbed = new EmbedBuilder()
            .setTitle("✅ Match Time Confirmed")
            .setDescription(
                `**<t:${timestamp}:F>**\n*(<t:${timestamp}:R>)*`
            )
            .setColor(0x00FF88);

        await interaction.reply({ embeds: [confirmEmbed] });

        // Start the draft
        session.phase = "initial_bans";
        session.bans = [];
        session.picks = [];
        session.extraMapBans = [];

        const pingId = session.teamA.id;
        const file = await buildDraftGraphic(session);
        const embed = buildDraftEmbed(session).setImage("attachment://series.png");

        const channel = interaction.guild.channels.cache.get(session.channelId);
        const draftMessage = await channel.send({
            content: `<@${pingId}> The draft is starting!`,
            embeds: [embed],
            files: [file],
            components: buildDraftComponents(session)
        });

        matchSessions.set(draftMessage.id, session);
        return;
    }

    if (interaction.isStringSelectMenu()) {

        if (
            ["team_select_a", "team_select_b", "series_length_select"].includes(interaction.customId)
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
                if (session.bans.length >= 2) session.phase = "picks";
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

            // Draft still in progress
            const picker = getCurrentPicker(session);
            const pingId = picker === "A" ? session.teamA.id : session.teamB.id;

            const file = await buildDraftGraphic(session);
            const embed = buildDraftEmbed(session).setImage("attachment://series.png");

            const oldMessageId = interaction.message.id;
            await interaction.message.delete();

            const channel = interaction.guild.channels.cache.get(session.channelId);
            const newMessage = await channel.send({
                content: `<@${pingId}>`,
                embeds: [embed],
                files: [file],
                components: buildDraftComponents(session)
            });

            matchSessions.delete(oldMessageId);
            matchSessions.set(newMessage.id, session);

            return;
        }
    }

    if (interaction.isButton() && interaction.customId === "submit_match") {

        if (interaction.user.id !== session.adminId) {
            return interaction.reply({
                content: "❌ Only the admin who created this match can submit it.",
                flags: 64
            });
        }

        const guild = interaction.guild;
        const category = guild.channels.cache.find(
            c => c.name === "Pending Matches" && c.type === 4
        );

        const channel = await guild.channels.create({
            name: `${session.teamA.name.toLowerCase()}-v-${session.teamB.name.toLowerCase()}`,
            type: 0,
            parent: category?.id ?? null,
            permissionOverwrites: [
                { id: guild.roles.everyone, deny: ["ViewChannel"] },
                { id: session.adminId,      allow: ["ViewChannel", "SendMessages"] },
                { id: session.teamA.id,     allow: ["ViewChannel", "SendMessages"] },
                { id: session.teamB.id,     allow: ["ViewChannel", "SendMessages"] }
            ]
        });

        session.channelId = channel.id;

        const scheduleEmbed = new EmbedBuilder()
            .setTitle(`🎮 ${session.teamA.name} vs ${session.teamB.name}`)
            .setDescription(
                `**BO${session.seriesLength} Match**\n\n` +
                `Use the button below to propose a match time.\n` +
                `The other team can accept or counter-propose.`
            )
            .setColor(0x00EEEE);

        const scheduleMessage = await channel.send({
            content: `<@${session.teamA.id}> <@${session.teamB.id}>`,
            embeds: [scheduleEmbed],
            components: buildScheduleComponents()
        });

        matchSessions.set(scheduleMessage.id, session);

        await interaction.deferUpdate();
        return interaction.editReply({
            content: `✅ Match created! Head to ${channel}`,
            embeds: [],
            components: []
        });
    }
}

module.exports = handleComponent;