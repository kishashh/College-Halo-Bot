const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require('discord.js');

const { getTeams, saveTeams } = require('../teamLoader');

async function execute(interaction) {

    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
            content: "❌ Only admins can delete teams.",
            flags: 64
        });
    }

    const teams = getTeams();

    if (!teams.length) {
        return interaction.reply({
            content: "❌ No teams found.",
            flags: 64
        });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId("deleteteam_select")
        .setPlaceholder("Select a team to delete")
        .addOptions(teams.map(t => ({
            label: t.label,
            value: t.label
        })));

    return interaction.reply({
        content: "⚠️ Select a team to delete:",
        components: [new ActionRowBuilder().addComponents(select)],
        flags: 64
    });
}

async function handleSelect(interaction) {

    if (!interaction.isStringSelectMenu() || interaction.customId !== "deleteteam_select") return false;

    const teamName = interaction.values[0];
    const teams    = getTeams();
    const filtered = teams.filter(t => t.label !== teamName);

    if (filtered.length === teams.length) {
        return interaction.reply({
            content: `❌ Team **${teamName}** not found.`,
            flags: 64
        });
    }

    saveTeams(filtered);

    const embed = new EmbedBuilder()
        .setTitle("🗑️ Team Deleted")
        .setDescription(`**${teamName}** has been removed.`)
        .setColor(0xff4444);

    return interaction.update({ embeds: [embed], components: [] });
}

module.exports = { execute, handleSelect };
