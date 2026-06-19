const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const { getTeams, deleteTeam } = require('../teamLoader');

async function execute(interaction) {

    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
            content: "❌ Only admins can delete teams.",
            flags: 64
        });
    }

    const teams = await getTeams();

    if (!teams.length) {
        return interaction.reply({ content: "❌ No teams found.", flags: 64 });
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

    const confirmButton = new ButtonBuilder()
        .setCustomId(`deleteteam_confirm|${teamName}`)
        .setLabel(`Yes, delete ${teamName}`)
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId("deleteteam_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary);

    return interaction.update({
        content: `⚠️ Are you sure you want to delete **${teamName}**? This cannot be undone.`,
        components: [new ActionRowBuilder().addComponents(confirmButton, cancelButton)]
    });
}

async function handleButton(interaction) {

    if (!interaction.isButton()) return false;

    if (interaction.customId === "deleteteam_cancel") {
        await interaction.update({
            content: "❌ Deletion cancelled.",
            components: []
        });
        return true;
    }

    if (interaction.customId.startsWith("deleteteam_confirm|")) {
        const teamName = interaction.customId.split("|")[1];
        const deleted  = await deleteTeam(teamName);

        if (!deleted) {
            await interaction.update({
                content: `❌ Team **${teamName}** not found.`,
                components: []
            });
            return true;
        }

        const embed = new EmbedBuilder()
            .setTitle("🗑️ Team Deleted")
            .setDescription(`**${teamName}** has been removed.`)
            .setColor(0xff4444);

        await interaction.update({ content: null, embeds: [embed], components: [] });
        return true;
    }

    return false;
}

module.exports = { execute, handleSelect, handleButton };