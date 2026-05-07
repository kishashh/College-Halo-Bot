module.exports = (client) => {

    client.on('clientReady', () => {
        console.log(`✅ ${client.user.tag} online.`);
    });

};