const {
    buildSetupEmbed
} = require('./setupEmbed');

const {
    buildSetupComponents
} = require('./components');

const {
    matchSessions
} = require('./sessionManager');

async function createMatch(interaction) {

    const session = {
        adminId: interaction.user.id,
        teamA: null,
        teamB: null
    };

    const reply = await interaction.reply({
        embeds: [buildSetupEmbed(session)],
        components: buildSetupComponents(session),
        fetchReply: true
    });

    matchSessions.set(reply.id, session);
}

module.exports = createMatch;