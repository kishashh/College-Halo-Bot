const { OBJS, SLAYER } = require('../../data/maps');
const SERIES_RULES = require('../../data/seriesRules');

const {
    isLegalPick
} = require('./legalityChecks');

/*
    Builds every possible mode/map combo from the map pools.
*/
function getAllCombos() {

    const combos = [];

    /*
        Add every OBJ combo.
    */
    for (const [mode, maps] of Object.entries(OBJS)) {

        maps.forEach(map => {

            combos.push({
                mode,
                map,
                type: "OBJ"
            });

        });
    }

    /*
        Add every Slayer combo.
    */
    SLAYER.forEach(map => {

        combos.push({
            mode: "Slayer",
            map,
            type: "Slayer"
        });

    });

    return combos;
}

/*
    Converts combo into string value for comparisons.
*/
function comboValue(combo) {
    return `${combo.mode}|${combo.map}`;
}

/*
    Returns every legal pick for the current game.
*/
function getLegalPickCombos(session) {

    /*
        Current game index.
    */
    const gameIndex = session.picks.length;

    /*
        Filter every combo through legality checker.
    */
    return getAllCombos().filter(combo =>
        isLegalPick(session, combo, gameIndex)
    );
}

/*
    Returns every legal ban combo.
*/
function getLegalBanCombos(session) {

    /*
        Convert banned combos into strings.
    */
    const bannedCombos = session.bans.map(comboValue);

    /*
        Remove already banned combos.
    */
    return getAllCombos().filter(combo =>
        !bannedCombos.includes(comboValue(combo))
    );
}

/*
    Returns legal map bans for BO7 Game 7 ban phase.
*/
function getLegalGame7MapBans(session) {

    /*
        Clone session while clearing current map bans.
    */
    const tempSession = {
        ...session,
        extraMapBans: []
    };

    /*
        Get legal Game 7 combos.
    */
    const legalCombos = getLegalPickCombos(tempSession);

    /*
        Return unique map names only.
    */
    return [...new Set(
        legalCombos.map(combo => combo.map)
    )];
}

/*
    Determines which team is currently picking/banning.
*/
function getCurrentPicker(session) {

    /*
        Initial bans phase.
    */
    if (session.phase === "initial_bans") {

        return session.bans.length === 0
            ? "A"
            : "B";
    }

    /*
        Game 7 map ban is always Team B.
    */
    if (session.phase === "extra_g7_ban") {
        return "B";
    }

    /*
        Normal pick phase.
    */
    if (session.phase === "picks") {

        const rules = SERIES_RULES[session.seriesLength];

        return rules.pickOrder[session.picks.length];
    }

    return null;
}

/*
    Returns Discord user ID of current picker.
*/
function getCurrentPickerUserId(session) {

    const picker = getCurrentPicker(session);

    /*
        Team A turn.
    */
    if (picker === "A") {
        return session.teamA.id;
    }

    /*
        Team B turn.
    */
    if (picker === "B") {
        return session.teamB.id;
    }

    return null;
}

/*
    Returns prompt text shown in embed/select menu.
*/
function getDraftPrompt(session) {

    /*
        Initial bans prompt.
    */
    if (session.phase === "initial_bans") {

        return session.bans.length === 0
            ? "Team A bans 1 mode/map combo"
            : "Team B bans 1 mode/map combo";
    }

    /*
        Game 7 map ban prompt.
    */
    if (session.phase === "extra_g7_ban") {
        return "Team B bans 1 map before Game 7";
    }

    /*
        Normal pick prompt.
    */
    if (session.phase === "picks") {

        const rules = SERIES_RULES[session.seriesLength];

        const gameIndex = session.picks.length;

        return `Team ${rules.pickOrder[gameIndex]} picks Game ${gameIndex + 1} ${rules.slots[gameIndex]}`;
    }

    /*
        Draft completed.
    */
    return "Draft complete";
}

module.exports = {
    getAllCombos,
    getLegalPickCombos,
    getLegalBanCombos,
    getLegalGame7MapBans,
    getCurrentPicker,
    getCurrentPickerUserId,
    getDraftPrompt,
    comboValue
};