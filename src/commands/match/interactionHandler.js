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
    buildDateSelectComponents,
    buildTimeSelectComponents,
    buildTimezoneSelectComponents,
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
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const API_URL = "https://halo-league-stats-production.up.railway.app";
const API_KEY = "9af1aae3c75ca04f2f841f36c3c9db95a145bd8656debad0fcea5a7ee7b7049d";

async function postSchedule(session) {
    const mapsAndModes = session.picks.map(pick => ({
        map:  pick.map,
        mode: pick.mode
    }));

    const scheduledDate = new Date(session.proposedTime.timestamp * 1000).toISOString();

    const payload = {
        type:            session.matchType,
        team_a:          session.teamA.name,
        team_b:          session.teamB.name,
        anchor_gamertag: "",
        scheduled_date:  scheduledDate,
        maps_and_modes:  mapsAndModes
    };

    const res = await fetch(`${API_URL}/api/schedule`, {
        method:  "POST",
        headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `API error ${res.status}`);
    }

    return await res.json();
}

function getTimeZoneOffsetMs(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).formatToParts(date);

    const filled = {};
    for (const part of parts) {
        filled[part.type] = part.value;
    }

    const asUTC = Date.UTC(
        Number(filled.year),
        Number(filled.month) - 1,
        Number(filled.day),
        Number(filled.hour),
        Number(filled.minute),
        Number(filled.second)
    );

    return asUTC - date.getTime();
}

function parseTimestamp(dateStr, timeStr, timeZone) {
    let [year, month, day] = dateStr.split("-").map(Number);
    let [hours, minutes] = timeStr.split(":").map(Number);

    // Handle midnight option
    if (hours === 24) {
        hours = 0;
        const d = new Date(Date.UTC(year, month - 1, day));
        d.setUTCDate(d.getUTCDate() + 1);

        year = d.getUTCFullYear();
        month = d.getUTCMonth() + 1;
        day = d.getUTCDate();
    }

    // First guess: pretend the selected time is UTC
    const guessedUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Find timezone offset for that date/time
    const offsetMs = getTimeZoneOffsetMs(guessedUTC, timeZone);

    // Convert local timezone time into real UTC
    const realUTC = guessedUTC.getTime() - offsetMs;

    return Math.floor(realUTC / 1000);
}

async function handleComponent(interaction) {

    // ── Button / Select interactions ──────────────────────────────────────────
    const session = matchSessions.get(interaction.message?.id)
        ?? [...matchSessions.values()].find(s => s.channelId === interaction.channelId);

    if (!session) return;

    // ── Propose time button → show date picker ────────────────────────────────
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

        const embed = new EmbedBuilder()
            .setTitle("📅 Propose Match Time")
            .setDescription("**Step 1 of 3** — Select a date")
            .setColor(0x00EEEE);

        return interaction.reply({
            embeds: [embed],
            components: buildDateSelectComponents(),
            flags: 64
        });
    }

    // ── Date selected → show time picker ─────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "schedule_date_select") {

        const dateValue = interaction.values[0]; // e.g. "2026-06-07"

        const embed = new EmbedBuilder()
            .setTitle("📅 Propose Match Time")
            .setDescription(`**Step 2 of 3** — Select a time\nDate: **${dateValue}**`)
            .setColor(0x00EEEE);

        await interaction.update({
            embeds: [embed],
            components: buildTimeSelectComponents(dateValue)
        });

        return;
    }

    // ── Time selected → show timezone picker ──────────────────────────────────
    if (
        interaction.isStringSelectMenu() &&
        ["schedule_time_select_early", "schedule_time_select_late"].includes(interaction.customId)
    ) {

        const dateTimeValue = interaction.values[0]; // e.g. "2026-06-07|19:00"
        const [dateStr, timeStr] = dateTimeValue.split("|");

        // Format time for display
        const [h, m] = timeStr.split(":").map(Number);
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const ampm = h >= 12 ? "pm" : "am";
        const timeDisplay = `${hour12}:${String(m).padStart(2,'0')}${ampm}`;

        const embed = new EmbedBuilder()
            .setTitle("📅 Propose Match Time")
            .setDescription(`**Step 3 of 3** — Select your timezone\nDate: **${dateStr}** at **${timeDisplay}**`)
            .setColor(0x00EEEE);

        await interaction.update({
            embeds: [embed],
            components: buildTimezoneSelectComponents(dateTimeValue)
        });

        return;
    }

    // ── Timezone selected → confirm proposal ──────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "schedule_tz_select") {

        const fullValue = interaction.values[0]; // e.g. "2026-06-07|19:00|EST"
        const [dateStr, timeStr, tz] = fullValue.split("|");

        const timestamp = parseTimestamp(dateStr, timeStr, tz);

        // Delete previous proposal if exists
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

        // Update the ephemeral picker to confirm
        await interaction.update({
            embeds: [{ title: "✅ Time proposed!", description: `<t:${timestamp}:F>`, color: 0x00FF88 }],
            components: []
        });

        // Post the proposal publicly in the channel
        const channel = interaction.guild.channels.cache.get(session.channelId);
        const proposalMsg = await channel.send({
            embeds: [embed],
            components: buildScheduleResponseComponents()
        });

        session.proposalMessageId = proposalMsg.id;
        return;
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
            ["team_select_a", "team_select_b", "series_length_select", "match_type_select"].includes(interaction.customId)
        ) {
            if (interaction.user.id !== session.adminId) {
                return interaction.reply({
                    content: "❌ Only the admin who created this match can edit setup.",
                    flags: 64
                });
            }
        }

        if (interaction.customId === "match_type_select") {
            session.matchType = interaction.values[0];
            await interaction.deferUpdate();
            return interaction.editReply({
                embeds: [buildSetupEmbed(session)],
                components: buildSetupComponents(session)
            });
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

            // Draft complete — POST to API
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

                try {
                    await postSchedule(session);
                    await channel.send({
                        content: "✅ Match successfully scheduled in the league system."
                    });
                } catch (err) {
                    await channel.send({
                        content: `⚠️ Draft complete but failed to submit to league system: ${err.message}`
                    });
                }

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
            const gameNumber = session.picks.length + 1;

            const isBanPhase =
                session.phase === "initial_bans" ||
                session.phase === "extra_g7_ban";

            const actionText = isBanPhase
                ? `it's your turn to ban`
                : `it's your turn to pick Game ${gameNumber}`;

            const newMessage = await channel.send({
                content: `<@${pingId}> ${actionText}`,
                embeds: [embed],
                files: [file],
                components: buildDraftComponents(session)
            });

            matchSessions.delete(oldMessageId);
            matchSessions.set(newMessage.id, session);

            return;
        }
    }

    // ── Submit match button → create channel ─────────────────────────────────
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

        const matchTypeLabel = {
            regular:   "Regular Season",
            playoff:   "Playoff",
            scrimmage: "Scrimmage"
        }[session.matchType] ?? session.matchType;

        const scheduleEmbed = new EmbedBuilder()
            .setTitle(`🎮 ${session.teamA.name} vs ${session.teamB.name}`)
            .setDescription(
                `**BO${session.seriesLength} ${matchTypeLabel} Match**\n\n` +
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