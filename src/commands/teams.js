const { EmbedBuilder } = require('discord.js');
const { getTeams } = require('../teamLoader');

async function execute(interaction) {

    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
            content: "❌ Only admins can use this command.",
            flags: 64
        });
    }

    const teams = await getTeams();

    if (!teams.length) {
        return interaction.reply({
            content: "No teams have been created yet.",
            flags: 64
        });
    }

    // Sort alphabetically by label
    teams.sort((a, b) => a.label.localeCompare(b.label));

    const list = teams.map(team => {
        const captainId = team.value.split("|")[1];
        return `**${team.label}** — <@${captainId}>`;
    }).join("\n");

    const embed = new EmbedBuilder()
        .setTitle(`🏆 League Teams (${teams.length})`)
        .setDescription(list)
        .setColor(0x00EEEE);

    return interaction.reply({ embeds: [embed] });
}

module.exports = { execute };