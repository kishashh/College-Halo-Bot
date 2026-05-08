module.exports = (client) => {

    client.on('clientReady', () => {
        console.log(`✅ ${client.user.tag} online.`);

        client.guilds.cache.forEach(guild => {
            console.log(`📌 Server: ${guild.name} (${guild.id})`);
        });
    });

};