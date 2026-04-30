require('dotenv').config();

const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

const client = new Client({ 
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

client.on('ready', (c) => {
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

client.login(token);

