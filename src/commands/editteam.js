const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');

const { getTeams, getTeam, saveTeam, deleteTeam } = require('../teamLoader');

async function execute(interaction) {

    if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
            content: "❌ Only admins can edit teams.",
            flags: 64
        });
    }

    const teams = await getTeams();

    if (!teams.length) {
        return interaction.reply({ content: "❌ No teams found.", flags: 64 });
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
    const team     = await getTeam(teamName);

    if (!team) {
        return interaction.reply({ content: `❌ Team **${teamName}** not found.`, flags: 64 });
    }

    const [, captainId] = team.value.split("|");

    let captainDisplay = captainId ?? "";
    try {
        await interaction.guild.members.fetch(captainId);
        const member = interaction.guild.members.cache.get(captainId);
        if (member) captainDisplay = member.user.username;
    } catch (_) {}

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
        .setLabel("Captain Username (e.g. kishash)")
        .setStyle(TextInputStyle.Short)
        .setValue(captainDisplay)
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId("team_color")
        .setLabel("Team Color hex (e.g. 841617)")
        .setStyle(TextInputStyle.Short)
        .setValue((team.color ?? "").replace("#", ""))
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(captainInput),
        new ActionRowBuilder().addComponents(colorInput)
    );

    return interaction.showModal(modal);
}

async function handleModal(interaction) {

    if (interaction.type !== 5 || !interaction.customId.startsWith("editteam_modal|")) return false;

    const originalName = interaction.customId.split("|")[1];
    const newName      = interaction.fields.getTextInputValue("team_name").trim();
    const username     = interaction.fields.getTextInputValue("captain_id").trim().toLowerCase();
    let   color        = interaction.fields.getTextInputValue("team_color").trim().replace("#", "");

    color = `#${color}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
            content: "❌ Invalid hex color. Use 6 characters e.g. `841617`.",
            flags: 64
        });
    }

    await interaction.guild.members.fetch();
    const member = interaction.guild.members.cache.find(
        m => m.user.username.toLowerCase() === username ||
             m.displayName.toLowerCase()   === username
    );

    if (!member) {
        return interaction.reply({
            content: `❌ Couldn't find a member with username **${username}** in this server.`,
            flags: 64
        });
    }

    const captainId = member.user.id;

    // If the name changed, delete the old document first
    if (newName !== originalName) {
        await deleteTeam(originalName);
    }

    await saveTeam({
        label: newName,
        value: `${newName}|${captainId}`,
        color
    });

    const embed = new EmbedBuilder()
        .setTitle("✅ Team Updated")
        .addFields(
            { name: "Team",    value: newName,                                     inline: true },
            { name: "Captain", value: `<@${captainId}> (${member.user.username})`, inline: true },
            { name: "Color",   value: color,                                       inline: true }
        )
        .setColor(color);

    return interaction.reply({ embeds: [embed] });
}

module.exports = { execute, handleSelect, handleModal };
