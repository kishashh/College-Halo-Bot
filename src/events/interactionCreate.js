const bo3 = require('../commands/bo3');
const bo5 = require('../commands/bo5');
const bo7 = require('../commands/bo7');
const match = require('../commands/match');
const test = require('../commands/test');
const createteam = require('../commands/createteam');
const deleteteam = require('../commands/deleteteam');
const editteam   = require('../commands/editteam');

module.exports = (client) => {

    client.on('interactionCreate', async (interaction) => {

        try {
            if (interaction.isChatInputCommand()) {

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

                    case 'test':
                        return test.execute(interaction);

                    case 'createteam':
                        return createteam.execute(interaction);

                    case 'deleteteam':
                        return deleteteam.execute(interaction);
                        
                    case 'editeams':
                        return editteam.execute(interaction);
                }
            }

            if (
                interaction.isStringSelectMenu() ||
                interaction.isButton() ||
                interaction.isModalSubmit()
            ) {
                if (await deleteteam.handleSelect(interaction)) return;
                if (await editteam.handleSelect(interaction)) return;
                if (await editteam.handleModal(interaction)) return;
                if (await createteam.handleModal(interaction)) return;
                return match.handleComponent(interaction);
            }

        } catch (error) {
            console.error(error);

            if (interaction.deferred || interaction.replied) {
                return interaction.followUp({
                    content: '❌ Something went wrong.',
                    flags: 64
                });
            }

            return interaction.reply({
                content: '❌ Something went wrong.',
                flags: 64
            });
        }
    });
};
