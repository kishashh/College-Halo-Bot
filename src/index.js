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

    const usedMaps = [];

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function pickMap(availableMaps, usedMaps) {
    const validMaps = availableMaps.filter(m => !usedMaps.includes(m));

    if (validMaps.length === 0) return null;

    return validMaps[Math.floor(Math.random() * validMaps.length)];
}

    const gts = Object.keys(OBJS);
    const tempObjs = JSON.parse(JSON.stringify(OBJS));
    const slayerMaps = [...SLAYER];

    const pickedGT = [];
    const pickedMaps = [];
    const games = [];

    for (let i = 0; i < length; i++) {

        let gt;
        let map;

        // Slayer slots (2,5,7 style pattern)
        if ([1, 4, 6].includes(i)) {
            gt = "Slayer";
            map = pickMap(slayerMaps, usedMaps);

            const idx = slayerMaps.indexOf(map);
            if (idx !== -1) slayerMaps.splice(idx, 1);

            usedMaps.push(map);
        }

        // special rule slot
        else if (i === 5 && length >= 7) {
            const availableGTs = gts.filter(x => x !== "CTF");
            gt = randomChoice(availableGTs);
            map = pickMap(tempObjs[gt], usedMaps);

            const idx = tempObjs[gt].indexOf(map);
            if (idx !== -1) tempObjs[gt].splice(idx, 1);

            usedMaps.push(map);
        }

        // normal OBJ slot
        else {
            const availableGTs = gts.filter(x => !pickedGT.includes(x));
            gt = randomChoice(availableGTs);

            pickedGT.push(gt);

            map = pickMap(tempObjs[gt], usedMaps);

            const idx = tempObjs[gt].indexOf(map);
            if (idx !== -1) tempObjs[gt].splice(idx, 1);

            usedMaps.push(map);
        }

        pickedMaps.push(map);
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

