const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const { getTeam, saveTeam } = require('../teamLoader');

async function execute(interaction) {

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
        .setLabel("Captain Username (e.g. kishash)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId("team_color")
        .setLabel("Team Color hex (e.g. 841617)")
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

    if (interaction.type !== 5 || interaction.customId !== "createteam_modal") return false;

    await interaction.deferReply({ flags: 64 });

    try {
        const name     = interaction.fields.getTextInputValue("team_name").trim();
        const username = interaction.fields.getTextInputValue("captain_id").trim().toLowerCase();
        let   color    = interaction.fields.getTextInputValue("team_color").trim().replace("#", "");

        color = `#${color}`;
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return interaction.editReply({
                content: "❌ Invalid hex color. Use 6 characters e.g. `841617`."
            });
        }

        await interaction.guild.members.fetch();
        const member = interaction.guild.members.cache.find(
            m => m.user.username.toLowerCase() === username ||
                 m.displayName.toLowerCase()   === username
        );

        if (!member) {
            return interaction.editReply({
                content: `❌ Couldn't find a member with username **${username}** in this server.`
            });
        }

        const captainId = member.user.id;

        const existing = await getTeam(name);
        if (existing) {
            return interaction.editReply({
                content: `❌ A team named **${name}** already exists.`
            });
        }

        const newTeam = {
            label: name,
            value: `${name}|${captainId}`,
            color
        };

        await saveTeam(newTeam);

        const embed = new EmbedBuilder()
            .setTitle("✅ Team Created")
            .addFields(
                { name: "Team",    value: name,                                        inline: true },
                { name: "Captain", value: `<@${captainId}> (${member.user.username})`, inline: true },
                { name: "Color",   value: color,                                       inline: true }
            )
            .setColor(color);

        return interaction.editReply({ embeds: [embed] });

    } catch (e) {
        console.error('createteam handleModal error:', e);
        return interaction.editReply({ content: '❌ Error: ' + e.message });
    }
}

module.exports = { execute, handleModal };