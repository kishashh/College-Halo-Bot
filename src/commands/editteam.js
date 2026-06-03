const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');

const { getTeams, saveTeams } = require('../teamLoader');

async function execute(interaction) {

    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
            content: "❌ Only admins can edit teams.",
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
        .setCustomId("editteam_select")
        .setPlaceholder("Select a team to edit")
        .addOptions(teams.map(t => ({
            label: t.label,
            value: t.label
        })));

    return interaction.reply({
        content: "Select a team to edit:",
        components: [new ActionRowBuilder().addComponents(select)],
        flags: 64
    });
}

async function handleSelect(interaction) {

    if (!interaction.isStringSelectMenu() || interaction.customId !== "editteam_select") return false;

    const teamName = interaction.values[0];
    const teams    = getTeams();
    const team     = teams.find(t => t.label === teamName);

    if (!team) {
        return interaction.reply({ content: `❌ Team **${teamName}** not found.`, flags: 64 });
    }

    const [, captainId] = team.value.split("|");

    const modal = new ModalBuilder()
        .setCustomId(`editteam_modal|${teamName}`)
        .setTitle(`Edit Team: ${teamName}`);

    const nameInput = new TextInputBuilder()
        .setCustomId("team_name")
        .setLabel("Team Name")
        .setStyle(TextInputStyle.Short)
        .setValue(team.label)
        .setRequired(true);

    const captainInput = new TextInputBuilder()
        .setCustomId("captain_id")
        .setLabel("Captain Discord ID")
        .setStyle(TextInputStyle.Short)
        .setValue(captainId ?? "")
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId("team_color")
        .setLabel("Team Color (hex, e.g. #841617)")
        .setStyle(TextInputStyle.Short)
        .setValue(team.color ?? "")
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(captainInput),
        new ActionRowBuilder().addComponents(colorInput)
    );

    return interaction.showModal(modal);
}

async function handleModal(interaction) {

    if (!interaction.isModalSubmit() || !interaction.customId.startsWith("editteam_modal|")) return false;

    const originalName = interaction.customId.split("|")[1];
    const newName      = interaction.fields.getTextInputValue("team_name").trim();
    const captainId    = interaction.fields.getTextInputValue("captain_id").trim();
    const color        = interaction.fields.getTextInputValue("team_color").trim();

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
            content: "❌ Invalid hex color. Use format `#RRGGBB`.",
            flags: 64
        });
    }

    const teams = getTeams();
    const index = teams.findIndex(t => t.label === originalName);

    if (index === -1) {
        return interaction.reply({ content: `❌ Team **${originalName}** not found.`, flags: 64 });
    }

    teams[index] = {
        label: newName,
        value: `${newName}|${captainId}`,
        color
    };

    saveTeams(teams);

    const embed = new EmbedBuilder()
        .setTitle("✅ Team Updated")
        .addFields(
            { name: "Team",    value: newName,            inline: true },
            { name: "Captain", value: `<@${captainId}>`,  inline: true },
            { name: "Color",   value: color,              inline: true }
        )
        .setColor(color);

    return interaction.reply({ embeds: [embed] });
}

module.exports = { execute, handleSelect, handleModal };
