const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const { getTeams, saveTeams } = require('../teamLoader');

async function execute(interaction) {

    // Only admins can create teams
    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
            content: "❌ Only admins can create teams.",
            flags: 64
        });
    }

    const modal = new ModalBuilder()
        .setCustomId("createteam_modal")
        .setTitle("Create Team");

    const nameInput = new TextInputBuilder()
        .setCustomId("team_name")
        .setLabel("Team Name (e.g. OU)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const captainInput = new TextInputBuilder()
        .setCustomId("captain_id")
        .setLabel("Captain Discord ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId("team_color")
        .setLabel("Team Color (hex, e.g. #841617)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(captainInput),
        new ActionRowBuilder().addComponents(colorInput)
    );

    return interaction.showModal(modal);
}

async function handleModal(interaction) {

    if (!interaction.isModalSubmit() || interaction.customId !== "createteam_modal") return false;

    const name     = interaction.fields.getTextInputValue("team_name").trim();
    const captainId = interaction.fields.getTextInputValue("captain_id").trim();
    const color    = interaction.fields.getTextInputValue("team_color").trim();

    // Validate hex color
    if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
            content: "❌ Invalid hex color. Use format `RRGGBB`.",
            flags: 64
        });
    }

    const teams = getTeams();

    // Check for duplicate
    if (teams.find(t => t.label.toLowerCase() === name.toLowerCase())) {
        return interaction.reply({
            content: `❌ A team named **${name}** already exists.`,
            flags: 64
        });
    }

    const newTeam = {
        label: name,
        value: `${name}|${captainId}`,
        color: `#${color}`
    };

    teams.push(newTeam);
    saveTeams(teams);

    const embed = new EmbedBuilder()
        .setTitle("✅ Team Created")
        .addFields(
            { name: "Team",    value: name,              inline: true },
            { name: "Captain", value: `<@${captainId}>`, inline: true },
            { name: "Color",   value: "#"+color,         inline: true }
        )
        .setColor(color);

    return interaction.reply({ embeds: [embed] });
}

module.exports = { execute, handleModal };
