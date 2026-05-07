require('dotenv').config();

const {
    Client,
    IntentsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const token = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

const OBJS = {
    CTF: ["Aquarius", "Empyrean", "Fortress", "Forbidden", "Origin"],
    Oddball: ["Live Fire", "Recharge", "Lattice", "Vacancy", "Streets"],
    Strongholds: ["Live Fire", "Recharge", "Lattice"],
    KOTH: ["Live Fire", "Recharge", "Lattice", "Vacancy", "Solitude"]
};

const SLAYER = ["Aquarius", "Live Fire", "Recharge", "Solitude", "Vacancy", "Origin", "Streets"];

const SERIES_RULES = {
    5: {
        slots: ["OBJ", "Slayer", "OBJ", "OBJ", "Slayer"],
        pickOrder: ["A", "A", "B", "A", "B"]
    },
    7: {
        slots: ["OBJ", "Slayer", "OBJ", "OBJ", "Slayer", "OBJ", "Slayer"],
        pickOrder: ["A", "A", "B", "A", "B", "B", "A"]
    }
};

const teamList = [
    { label: "OU", value: "OU|280175942159040514" },
    { label: "CHalo", value: "CHalo|1499498152867135498" },
    { label: "Bad team", value: "Bad team|507996530452463617" },
];

const matchSessions = new Map();

client.on('clientReady', (c) => {
    console.log(`✅ ${c.user.tag} is online.`);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        console.log(interaction.commandName);

        if (interaction.commandName === 'hey') {
            return interaction.reply('Hey!');
        }

        if (interaction.commandName === 'bo3') {
            return seriesBuilder(3, interaction);
        }

        if (interaction.commandName === 'bo5') {
            return seriesBuilder(5, interaction);
        }

        if (interaction.commandName === 'bo7') {
            return seriesBuilder(7, interaction);
        }

        if (interaction.commandName === 'match') {
            if (!interaction.member.permissions.has("Administrator")) {
                return interaction.reply({
                    content: "❌ You must be an admin to use this command.",
                    flags: 64
                });
            }

            return createMatch(interaction);
        }
    }

    if (interaction.isStringSelectMenu()) {
        const session = matchSessions.get(interaction.message.id);
        if (!session) return;

        if (["team_select_a", "team_select_b", "series_length_select"].includes(interaction.customId)) {
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
            return updateSetupMessage(interaction, session);
        }

        if (interaction.customId === "team_select_b") {
            const [teamName, teamId] = interaction.values[0].split("|");
            session.teamB = { name: teamName, id: teamId };

            await interaction.deferUpdate();
            return updateSetupMessage(interaction, session);
        }

        if (interaction.customId === "series_length_select") {
            session.seriesLength = Number(interaction.values[0]);

            await interaction.deferUpdate();
            return updateSetupMessage(interaction, session);
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

            await interaction.deferUpdate();
            await updateDraftMessage(interaction, session);

            if (session.phase === "complete") {
                await interaction.followUp({
                    content: `## ✅ Draft Complete\n${session.teamA.name} vs ${session.teamB.name}`,
                    embeds: [buildDraftEmbed(session)],
                    components: []
                });
            }

            return;
        }
    }

    if (interaction.isButton()) {
        const session = matchSessions.get(interaction.message.id);
        if (!session) return;

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
            return updateDraftMessage(interaction, session);
        }
    }
});

function getCurrentPickerUserId(session) {
    if (session.phase === "initial_bans") {
        return session.bans.length === 0
            ? session.teamA.id
            : session.teamB.id;
    }

    if (session.phase === "extra_g7_ban") {
        return session.teamB.id;
    }

    if (session.phase === "picks") {
        const rules = SERIES_RULES[session.seriesLength];
        const gameIndex = session.picks.length;
        const picker = rules.pickOrder[gameIndex];

        return picker === "A"
            ? session.teamA.id
            : session.teamB.id;
    }

    return null;
}

function seriesBuilder(length, interaction) {
    const gts = Object.keys(OBJS);
    const tempObjs = JSON.parse(JSON.stringify(OBJS));
    const slayerMaps = [...SLAYER];

    const gamesByIndex = [];
    const games = [];

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getAllowedRepeatIndexes(i) {
        if (i === 5) return [1, 4];
        if (i === 6) return [0, 2, 3];
        return [];
    }

    function pickMap(availableMaps, i, isBO7) {
        if (!isBO7) {
            const used = gamesByIndex.map(g => g.map);
            const valid = availableMaps.filter(m => !used.includes(m));
            return randomChoice(valid.length ? valid : availableMaps);
        }

        const allowedRepeatIndexes = getAllowedRepeatIndexes(i);

        const repeatAllowedMaps = gamesByIndex
            .filter((_, idx) => allowedRepeatIndexes.includes(idx))
            .map(g => g.map);

        const usedElsewhere = gamesByIndex.map(g => g.map);

        const pool = availableMaps.filter(m => {
            const alreadyUsed = usedElsewhere.includes(m);
            const allowedRepeat = repeatAllowedMaps.includes(m);
            return !alreadyUsed || allowedRepeat;
        });

        return randomChoice(pool.length ? pool : availableMaps);
    }

    const isBO7 = length === 7;
    const pickedGT = [];

    for (let i = 0; i < length; i++) {
        let gt;
        let map;

        if ([1, 4, 6].includes(i)) {
            gt = "Slayer";
            map = pickMap(slayerMaps, i, isBO7);

            const idx = slayerMaps.indexOf(map);
            if (idx !== -1) slayerMaps.splice(idx, 1);
        } else if (i === 5 && isBO7) {
            const availableGTs = gts.filter(x => x !== "CTF");
            gt = randomChoice(availableGTs);

            map = pickMap(tempObjs[gt], i, isBO7);

            const idx = tempObjs[gt].indexOf(map);
            if (idx !== -1) tempObjs[gt].splice(idx, 1);
        } else {
            const availableGTs = gts.filter(x => !pickedGT.includes(x));
            gt = randomChoice(availableGTs);

            pickedGT.push(gt);

            map = pickMap(tempObjs[gt], i, isBO7);

            const idx = tempObjs[gt].indexOf(map);
            if (idx !== -1) tempObjs[gt].splice(idx, 1);
        }

        gamesByIndex.push({ gt, map });
        games.push(`${gt} - ${map}`);
    }

    const embed = new EmbedBuilder()
        .setTitle(`BO${length} Series`)
        .setDescription(`Maps to be played in best of ${length} series`)
        .setThumbnail('https://static-cdn.jtvnw.net/jtv_user_pictures/2b3fb5fc-ba4b-4d42-baae-852eb79d89ea-profile_image-70x70.png')
        .setColor(0x00EEEE);

    games.forEach((game, i) => {
        embed.addFields({
            name: `Game ${i + 1}`,
            value: game
        });
    });

    interaction.reply({ embeds: [embed] });
}

async function createMatch(interaction) {
    const session = {
        adminId: interaction.user.id,
        teamA: null,
        teamB: null,
        seriesLength: null,
        phase: "setup",
        bans: [],
        picks: [],
        extraMapBans: []
    };

    const reply = await interaction.reply({
        embeds: [buildSetupEmbed(session)],
        components: buildSetupComponents(session),
        fetchReply: true
    });

    matchSessions.set(reply.id, session);
}

function buildSetupEmbed(session) {
    return new EmbedBuilder()
        .setTitle("🏆 League Match Setup")
        .setDescription(
            [
                "**Admin Match Creation Panel**",
                "",
                "⚠️ Team A is automatically the higher seed.",
                "",
                "1️⃣ Select Team A",
                "2️⃣ Select Team B",
                "3️⃣ Select BO5 or BO7",
                "4️⃣ Press Submit Match"
            ].join("\n")
        )
        .addFields(
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
                value: session.seriesLength ? `BO${session.seriesLength}` : "Not Selected",
                inline: true
            }
        )
        .setColor(0x00EEEE)
        .setFooter({ text: "League Match System" });
}

function buildSetupComponents(session) {
    const teamSelectA = new StringSelectMenuBuilder()
        .setCustomId("team_select_a")
        .setPlaceholder("Select HIGHER SEED (Team A)")
        .addOptions(
            teamList.map(team => ({
                ...team,
                default: session.teamA?.id === team.value.split("|")[1]
            }))
        );

    const teamSelectB = new StringSelectMenuBuilder()
        .setCustomId("team_select_b")
        .setPlaceholder("Select LOWER SEED (Team B)")
        .addOptions(
            teamList.map(team => ({
                ...team,
                default: session.teamB?.id === team.value.split("|")[1]
            }))
        );

    const seriesSelect = new StringSelectMenuBuilder()
        .setCustomId("series_length_select")
        .setPlaceholder("Select series length")
        .addOptions(
            { label: "BO5", value: "5", default: session.seriesLength === 5 },
            { label: "BO7", value: "7", default: session.seriesLength === 7 }
        );

    const submitButton = new ButtonBuilder()
        .setCustomId("submit_match")
        .setLabel("Submit Match")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!(session.teamA && session.teamB && session.seriesLength));

    return [
        new ActionRowBuilder().addComponents(teamSelectA),
        new ActionRowBuilder().addComponents(teamSelectB),
        new ActionRowBuilder().addComponents(seriesSelect),
        new ActionRowBuilder().addComponents(submitButton)
    ];
}

async function updateSetupMessage(interaction, session) {
    await interaction.editReply({
        embeds: [buildSetupEmbed(session)],
        components: buildSetupComponents(session)
    });
}

function getAllCombos() {
    const combos = [];

    for (const [mode, maps] of Object.entries(OBJS)) {
        maps.forEach(map => {
            combos.push({
                mode,
                map,
                type: "OBJ"
            });
        });
    }

    SLAYER.forEach(map => {
        combos.push({
            mode: "Slayer",
            map,
            type: "Slayer"
        });
    });

    return combos;
}

function comboValue(combo) {
    return `${combo.mode}|${combo.map}`;
}

function hasMapRepeat(session) {
    const maps = session.picks.map(pick => pick.map);
    return new Set(maps).size !== maps.length;
}

function isLegalPick(session, combo, gameIndex) {
    const rules = SERIES_RULES[session.seriesLength];
    const slotType = rules.slots[gameIndex];

    if (combo.type !== slotType) return false;

    const bannedCombos = session.bans.map(comboValue);
    if (bannedCombos.includes(comboValue(combo))) return false;

    if (session.extraMapBans.includes(combo.map)) return false;

    // OBJ modes cannot repeat.
    // BO5: prevents duplicate OBJ modes.
    // BO7: forces all 4 OBJ modes to appear exactly once.
    if (combo.type === "OBJ") {
        const usedObjModes = session.picks
            .filter(pick => pick.type === "OBJ")
            .map(pick => pick.mode);

        if (usedObjModes.includes(combo.mode)) return false;
    }

    const usedMaps = session.picks.map(pick => pick.map);
    const usedObjMaps = session.picks
        .filter(pick => pick.type === "OBJ")
        .map(pick => pick.map);

    const usedSlayerMaps = session.picks
        .filter(pick => pick.type === "Slayer")
        .map(pick => pick.map);

    if (session.seriesLength === 5) {
        return !usedMaps.includes(combo.map);
    }

    if (gameIndex < 5) {
        return !usedMaps.includes(combo.map);
    }

    // BO7 Games 6 and 7: ignore global map repeats.
    // Still do not allow duplicate Slayer maps.
    // Still do not allow duplicate OBJ modes because of the mode rule above.
    if (session.seriesLength === 7 && gameIndex >= 5) {
        if (combo.type === "Slayer" && usedSlayerMaps.includes(combo.map)) return false;
        return true;
    }

    // Normal restriction before Game 6
    if (combo.type === "OBJ" && usedObjMaps.includes(combo.map)) return false;
    if (combo.type === "Slayer" && usedSlayerMaps.includes(combo.map)) return false;

    if (usedMaps.includes(combo.map)) {
        if (hasMapRepeat(session)) return false;
        return true;
    }

    return true;
}

function getLegalPickCombos(session) {
    const gameIndex = session.picks.length;
    return getAllCombos().filter(combo => isLegalPick(session, combo, gameIndex));
}

function getLegalBanCombos(session) {
    const bannedCombos = session.bans.map(comboValue);
    return getAllCombos().filter(combo => !bannedCombos.includes(comboValue(combo)));
}

function getLegalGame7MapBans(session) {
    const tempSession = {
        ...session,
        extraMapBans: []
    };

    const legalG7Combos = getLegalPickCombos(tempSession);
    return [...new Set(legalG7Combos.map(combo => combo.map))];
}

function getDraftPrompt(session) {
    if (session.phase === "initial_bans") {
        return session.bans.length === 0
            ? "Team A bans 1 mode/map combo"
            : "Team B bans 1 mode/map combo";
    }

    if (session.phase === "extra_g7_ban") {
        return "Team B bans 1 map before Game 7";
    }

    if (session.phase === "picks") {
        const rules = SERIES_RULES[session.seriesLength];
        const gameIndex = session.picks.length;

        return `Team ${rules.pickOrder[gameIndex]} picks Game ${gameIndex + 1} ${rules.slots[gameIndex]}`;
    }

    return "Draft complete";
}

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

function buildDraftComponents(session) {
    if (session.phase === "complete") return [];

    let options = [];

    if (session.phase === "initial_bans") {
        options = getLegalBanCombos(session).map(combo => ({
            label: `${combo.mode} - ${combo.map}`,
            value: `BAN|${combo.mode}|${combo.map}`
        }));
    }

    if (session.phase === "picks") {
        options = getLegalPickCombos(session).map(combo => ({
            label: `${combo.mode} - ${combo.map}`,
            value: `PICK|${combo.mode}|${combo.map}`
        }));
    }

    if (session.phase === "extra_g7_ban") {
        options = getLegalGame7MapBans(session).map(map => ({
            label: map,
            value: `MAPBAN|${map}`
        }));
    }

    if (!options.length) return [];

    const select = new StringSelectMenuBuilder()
        .setCustomId("draft_select")
        .setPlaceholder(getDraftPrompt(session))
        .addOptions(options.slice(0, 25));

    return [
        new ActionRowBuilder().addComponents(select)
    ];
}

async function updateDraftMessage(interaction, session) {
    await interaction.editReply({
        embeds: [buildDraftEmbed(session)],
        components: buildDraftComponents(session)
    });
}

client.login(token);