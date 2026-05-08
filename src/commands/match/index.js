const createMatch = require('./createMatch');
const handleComponent = require('./interactionHandler');

async function execute(interaction) {
    return createMatch(interaction);
}

module.exports = {
    execute,
    handleComponent
};