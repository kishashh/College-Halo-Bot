const { OBJS, SLAYER } = require('../../data/maps');

function randomChoice(arr) {

    return arr[
        Math.floor(Math.random() * arr.length)
    ];
}

function getAllowedRepeatIndexes(index) {

    if (index === 5) {
        return [1, 4];
    }

    if (index === 6) {
        return [0, 2, 3];
    }

    return [];
}

function pickMap(
    availableMaps,
    games,
    index,
    isBO7
) {

    /*
        BO5:
        absolutely no repeats
    */

    if (!isBO7) {

        const usedMaps = games.map(
            game => game.map
        );

        const validMaps = availableMaps.filter(
            map => !usedMaps.includes(map)
        );

        return randomChoice(
            validMaps.length
                ? validMaps
                : availableMaps
        );
    }

    /*
        BO7:
        allow repeats in Games 6/7
    */

    const allowedRepeatIndexes =
        getAllowedRepeatIndexes(index);

    const repeatAllowedMaps = games
        .filter((_, i) =>
            allowedRepeatIndexes.includes(i)
        )
        .map(game => game.map);

    const usedMaps = games.map(
        game => game.map
    );

    const validMaps = availableMaps.filter(map => {

        const alreadyUsed =
            usedMaps.includes(map);

        const allowedRepeat =
            repeatAllowedMaps.includes(map);

        return !alreadyUsed || allowedRepeat;
    });

    return randomChoice(
        validMaps.length
            ? validMaps
            : availableMaps
    );
}

function generateSeries(length) {

    const gameTypes = Object.keys(OBJS);

    const tempObjs = JSON.parse(JSON.stringify(OBJS));
    const slayerMaps = [...SLAYER];

    const games = [];
    const pickedObjModes = [];

    const isBO7 = length === 7;

    for (let i = 0; i < length; i++) {

        let mode;
        let map;

        const isSlayerSlot = [1, 4, 6].includes(i);

        /*
            Slayer games:
            Game 2, Game 5, Game 7

            Game 7 CAN use a map that was used for OBJ, but it cannot use a Slayer map already used.
            Game 7 CANNOT be the same map as Game 6, even if that map was only used for OBJ.
        */
        if (isSlayerSlot) {

            mode = "Slayer";

            const usedSlayerMaps = games
                .filter(game => game.mode === "Slayer")
                .map(game => game.map);

            let availableMaps = slayerMaps.filter(
                map => !usedSlayerMaps.includes(map)
            );

            /*
                BO5 and BO7 Games 2/5:
                no global map repeats yet
            */
            if (!(isBO7 && i === 6)) {
                const usedMaps = games.map(game => game.generatedMap);

                availableMaps = availableMaps.filter(
                    map => !usedMaps.includes(map)
                );
            }

            // Game 7 cannot be the same map as Game 6
            if (isBO7 && i === 6) {
                const game6Map = games[5]?.map;

                availableMaps = availableMaps.filter(
                    map => map !== game6Map
                );
            }

            map = randomChoice(
                availableMaps.length ? availableMaps : slayerMaps
            );
        }

        /*
            OBJ games:
            Game 1, Game 3, Game 4, Game 6

            OBJ mode CANNOT repeat. Example: KOTH cannot appear twice.
            Game 6 CAN use a map that was used for Slayer, but it should not use an OBJ map already used.
        */
        else {

            const availableModes = gameTypes.filter(
                gameType => !pickedObjModes.includes(gameType)
            );

            mode = randomChoice(availableModes);

            pickedObjModes.push(mode);

            const usedObjMaps = games
                .filter(game => game.mode !== "Slayer")
                .map(game => game.map);

            let availableMaps = tempObjs[mode].filter(
                map => !usedObjMaps.includes(map)
            );

            /*
                BO5 and BO7 Games 1-4:
                no global map repeats yet
            */
            if (!(isBO7 && i === 5)) {
                const usedMaps = games.map(game => game.generatedMap);

                availableMaps = availableMaps.filter(
                    map => !usedMaps.includes(map)
                );
            }

            map = randomChoice(
                availableMaps.length ? availableMaps : tempObjs[mode]
            );
        }

        games.push({
            mode: null,
            map: null,
            pickedBy: null,

            generatedMode: mode,
            generatedMap: map
        });
    }

    return games;
}

module.exports = {
    generateSeries
};