const bo3 = require('../commands/bo3');
const bo5 = require('../commands/bo5');
const bo7 = require('../commands/bo7');
const match = require('../commands/match');

module.exports = (client) => {

    client.on('interactionCreate', async (interaction) => {

        if (!interaction.isChatInputCommand()) return;

        switch (interaction.commandName) {

            case 'hey':
                return interaction.reply('Hey!');

            case 'bo3':
                return bo3.execute(interaction);

            case 'bo5':
                return bo5.execute(interaction);

            case 'bo7':
                return bo7.execute(interaction);

            case 'match':
                return match.execute(interaction);
        }
    });
};