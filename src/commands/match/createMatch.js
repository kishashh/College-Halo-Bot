const {
    buildSetupEmbed
} = require('./setupEmbed');

const {
    buildSetupComponents
} = require('./components');

const { matchSessions } = require('../../sessionManager');

async function createMatch(interaction) {

    const session = {
        adminId: interaction.user.id,
        teamA: null,
        teamB: null
    };

    const { reply, resource } = await interaction.reply({
        embeds: [buildSetupEmbed(session)],
        components: buildSetupComponents(session),
        withResponse: true
    });

    matchSessions.set(resource.message.id, session);
}

module.exports = createMatch;