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

client.on('clientReady', (c) => {
    console.log(`✅ ${c.user.tag} is online.`);
});

client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(interaction.commandName);
    if (interaction.commandName === 'hey') {
        interaction.reply('Hey!');
    }
    if (interaction.commandName === 'bo3') {
        seriesBuilder(3, interaction);
    }
    if (interaction.commandName === 'bo5') {
        seriesBuilder(5, interaction);
    }
    if (interaction.commandName === 'bo7') {
        seriesBuilder(7, interaction);
    }
    if (interaction.commandName === 'match') {

        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: "❌ You must be an admin to use this command.",
                flags: 64
            });
        }

        createMatch(interaction);
    }
});

function seriesBuilder(length, interaction) {

    const OBJS = {
        CTF: ["Aquarius", "Empyrean", "Fortress", "Forbidden", "Origin"],
        Oddball: ["Live Fire", "Recharge", "Lattice", "Vacancy", "Streets"],
        Strongholds: ["Live Fire", "Recharge", "Lattice", "Solitude"],
        KOTH: ["Live Fire", "Recharge", "Lattice", "Vacancy"]
    };

    const SLAYER = ["Aquarius", "Live Fire", "Recharge", "Solitude", "Vacancy", "Origin", "Streets"];

    const gts = Object.keys(OBJS);
    const tempObjs = JSON.parse(JSON.stringify(OBJS));
    const slayerMaps = [...SLAYER];

    const gamesByIndex = [];
    const games = [];

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // BO7 repeat rules
    function getAllowedRepeatIndexes(i) {
        if (i === 5) return [1, 4]; // game 6 → game 2 or 5
        if (i === 6) return [0, 2, 3]; // game 7 → game 1,3,4
        return [];
    }

    function pickMap(availableMaps, i, isBO7) {

        if (!isBO7) {
            // BO3 / BO5 → strict no repeats
            const used = gamesByIndex.map(g => g.map);
            const valid = availableMaps.filter(m => !used.includes(m));
            return randomChoice(valid.length ? valid : availableMaps);
        }

        // BO7 logic
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

        // SLAYER slots (2,5,7)
        if ([1, 4, 6].includes(i)) {

            gt = "Slayer";

            map = pickMap(slayerMaps, i, isBO7);

            const idx = slayerMaps.indexOf(map);
            if (idx !== -1) slayerMaps.splice(idx, 1);
        }

        // special OBJ slot (BO7 only)
        else if (i === 5 && isBO7) {

            const availableGTs = gts.filter(x => x !== "CTF");
            gt = randomChoice(availableGTs);

            map = pickMap(tempObjs[gt], i, isBO7);

            const idx = tempObjs[gt].indexOf(map);
            if (idx !== -1) tempObjs[gt].splice(idx, 1);
        }

        // normal OBJ slot
        else {

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

    // ---------------- EMBED BUILD ----------------

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

const matchSessions = new Map();

client.on("interactionCreate", async (interaction) => {

   // ---------------- SELECT MENUS ----------------
    if (interaction.isStringSelectMenu()) {

        const session = matchSessions.get(interaction.user.id);
        if (!session) return;

        // TEAM A
        if (interaction.customId === "team_select_a") {

            const [teamName, teamId] = interaction.values[0].split("|");

            session.teamA = {
                name: teamName,
                id: teamId
            };
        }

        // TEAM B
        if (interaction.customId === "team_select_b") {

            const [teamName, teamId] = interaction.values[0].split("|");

            session.teamB = {
                name: teamName,
                id: teamId
            };
        }

        // acknowledge instantly
        await interaction.deferUpdate();

        // ---------------- TEAM LIST ----------------

        const teamList = [
            { label: "OU", value: "OU|280175942159040514" },
            { label: "CHalo", value: "CHalo|1499498152867135498" },
            { label: "Bad team", value: "Bad team|507996530452463617" },
        ];

        // ---------------- REBUILD DROPDOWNS ----------------

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

        const rowA = new ActionRowBuilder()
            .addComponents(teamSelectA);

        const rowB = new ActionRowBuilder()
            .addComponents(teamSelectB);

        // ---------------- EMBED ----------------

        const embed = new EmbedBuilder()
            .setTitle("🏆 League Match Setup")
            .setDescription(
                [
                    "**Admin Match Creation Panel**",
                    "",
                    "⚠️ Rule: **Team A is automatically the higher seed**",
                    "",
                    "1️⃣ Select Team A (Higher Seed)",
                    "2️⃣ Select Team B (Lower Seed)",
                    "3️⃣ Press Submit Match"
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
                }
            )
            .setColor(0x00EEEE);

        // ---------------- SUBMIT BUTTON ----------------

        const submitButton = new ButtonBuilder()
            .setCustomId("submit_match")
            .setLabel("Submit Match")
            .setStyle(ButtonStyle.Success)
            .setDisabled(!(session.teamA && session.teamB));

        const submitRow = new ActionRowBuilder()
            .addComponents(submitButton);

        // ---------------- UPDATE MESSAGE ----------------

        await interaction.editReply({
            embeds: [embed],
            components: [rowA, rowB, submitRow]
        });
    }

    // ---------------- SUBMIT BUTTON ----------------
    if (interaction.isButton()) {

        if (interaction.customId !== "submit_match") return;

        const session = matchSessions.get(interaction.user.id);
        if (!session) return;

        const pingMessage =
            `## 🏆 Match Created!\n\n` +
            `**Higher Seed:** ${session.teamA.name} - <@${session.teamA.id}>\n` +
            `**Lower Seed:** ${session.teamB.name} - <@${session.teamB.id}>`;

        await interaction.reply({
            content: pingMessage,
            ephemeral: false
        });

        console.log("MATCH READY:", session);

        // cleanup
        matchSessions.delete(interaction.user.id);
    }
});

async function createMatch(interaction) {

    const sessionId = interaction.user.id;

    matchSessions.set(sessionId, {
        step: "team_select",
        teamA: null,
        teamB: null,
        higherSeed: null
    });

     // ---------------- EMBED ----------------
    const embed = new EmbedBuilder()
        .setTitle("🏆 League Match Setup")
        .setDescription(
            [
                "**Admin Match Creation Panel**",
                "",
                "⚠️ Rule: **Team A is automatically the higher seed**",
                "",
                "1️⃣ Select Team A (Higher Seed)",
                "2️⃣ Select Team B (Lower Seed)",
                "",
                "➡ Match will auto-start after selection",
            ].join("\n")
        )
        .addFields(
            { name: "Team A", value: "Higher Seed (Not Selected)", inline: true },
            { name: "Team B", value: "Lower Seed (Not Selected)", inline: true }
        )
        .setColor(0x00EEEE)
        .setFooter({ text: "League Match System" });

    // ---------------- DROPDOWNS ----------------

    const teamList = [
        { label: "OU", value: "OU|280175942159040514" },
        { label: "CHalo", value: "CHalo|1499498152867135498" },
        { label: "Bad team", value: "Bad team|507996530452463617" },
    ];

    const teamSelectA = new StringSelectMenuBuilder()
        .setCustomId("team_select_a")
        .setPlaceholder("Select HIGHER SEED (Team A)")
        .addOptions(teamList);

    const teamSelectB = new StringSelectMenuBuilder()
        .setCustomId("team_select_b")
        .setPlaceholder("Select LOWER SEED (Team B)")
        .addOptions(teamList);

    const rowA = new ActionRowBuilder().addComponents(teamSelectA);
    const rowB = new ActionRowBuilder().addComponents(teamSelectB);

    const submitButton = new ButtonBuilder()
        .setCustomId("submit_match")
        .setLabel("Submit Match")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

    const submitRow = new ActionRowBuilder()
        .addComponents(submitButton);

    await interaction.reply({
        embeds: [embed],
        components: [rowA, rowB, submitRow],
        flags: 64
    });
}

client.login(token);

