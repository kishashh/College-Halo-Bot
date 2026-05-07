const createMatch = require('./createMatch');

async function execute(interaction) {
    return createMatch(interaction);
}

module.exports = {
    execute
};