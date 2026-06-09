const SERIES_RULES = require('../../data/seriesRules');
const { OBJS, SLAYER } = require('../../data/maps');

/*
    Checks if the current series already contains ANY repeated maps.
*/
function hasMapRepeat(session) {

    const maps = session.picks.map(
        pick => pick.map
    );

    return new Set(maps).size !== maps.length;
}

/*
    Counts how many alternative maps exist for game 6 (index 5) in a BO7.
    Used to enforce the rule: if alternatives exist, game 6 cannot repeat game 5's map.
*/
function countAlternativeMapsForGame6(session, excludeMap) {

    const usedObjModes = session.picks
        .filter(pick => pick.type === "OBJ")
        .map(pick => pick.mode);

    const usedObjMaps = session.picks
        .filter(pick => pick.type === "OBJ")
        .map(pick => pick.map);

    const availableObjModes = Object.keys(OBJS).filter(
        mode => !usedObjModes.includes(mode)
    );

    const alternatives = new Set();

    for (const mode of availableObjModes) {
        for (const map of OBJS[mode]) {
            if (map !== excludeMap && !usedObjMaps.includes(map)) {
                alternatives.add(map);
            }
        }
    }

    return alternatives.size;
}

/*
    Main legality checker.

    Determines whether a mode/map combo is legal for the current game slot.
*/
function isLegalPick(session, combo, gameIndex) {

    /*
        Get BO5 / BO7 rules
    */
    const rules = SERIES_RULES[session.seriesLength];

    /*
        Determine whether this game slot is OBJ or Slayer.
    */
    const slotType = rules.slots[gameIndex];

    /*
        Combo type MUST match slot type.

        Example:
        Cannot pick Slayer during OBJ slot.
    */
    if (combo.type !== slotType) {
        return false;
    }

    /*
        Build list of banned combos.
    */
    const bannedCombos = session.bans.map(
        ban => `${ban.mode}|${ban.map}`
    );

    /*
        Cannot pick banned combo.
    */
    if (
        bannedCombos.includes(
            `${combo.mode}|${combo.map}`
        )
    ) {
        return false;
    }

    /*
        Cannot pick map banned during Game 7 map ban phase.
    */
    if (
        session.extraMapBans.includes(combo.map)
    ) {
        return false;
    }

    /*
        =====================================
        OBJ MODE RESTRICTIONS
        =====================================

        OBJ modes can NEVER repeat.

        Example:
        - Cannot play KOTH twice
        - Cannot play CTF twice

        BO7 specifically forces:
        - all 4 OBJ modes exactly once
    */

    if (combo.type === "OBJ") {

        const usedObjModes = session.picks
            .filter(pick => pick.type === "OBJ")
            .map(pick => pick.mode);

        /*
            Reject duplicate OBJ mode.
        */
        if (usedObjModes.includes(combo.mode)) {
            return false;
        }
    }

    /*
        =====================================
        USED MAP TRACKING
        =====================================
    */

    /*
        Every map used in series.
    */
    const usedMaps = session.picks.map(
        pick => pick.map
    );

    /*
        Maps used ONLY in OBJ.
    */
    const usedObjMaps = session.picks
        .filter(pick => pick.type === "OBJ")
        .map(pick => pick.map);

    /*
        Maps used ONLY in Slayer.
    */
    const usedSlayerMaps = session.picks
        .filter(pick => pick.type === "Slayer")
        .map(pick => pick.map);

    /*
        =====================================
        BO5 RULES
        =====================================

        NO map repeats at all.
    */

    if (session.seriesLength === 5) {

        return !usedMaps.includes(combo.map);
    }

    /*
        =====================================
        BO7 GAMES 1-5
        =====================================

        NO repeats yet.
    */

    if (gameIndex < 5) {

        return !usedMaps.includes(combo.map);
    }

    /*
        =====================================
        BO7 GAMES 6/7 SPECIAL RULES
        =====================================

        Global repeats are allowed.

        HOWEVER:

        - OBJ modes still cannot repeat
        - Slayer maps cannot repeat
        - Game 7 cannot equal Game 6 map
        - Game 6 cannot equal Game 5 map IF alternatives exist
    */

    if (
        session.seriesLength === 7 &&
        gameIndex >= 5
    ) {

        /*
            Game 7 cannot use same map as Game 6.
        */
        if (
            gameIndex === 6 &&
            combo.map === session.picks[5]?.map
        ) {
            return false;
        }

        /*
            Game 6 cannot use same map as Game 5
            UNLESS no alternative maps exist (forced repeat).
        */
        if (
            gameIndex === 5 &&
            combo.map === session.picks[4]?.map
        ) {
            const alternatives = countAlternativeMapsForGame6(session, combo.map);

            if (alternatives > 0) {
                return false;
            }

            // No alternatives exist — forced repeat is allowed
        }

        /*
            Slayer maps cannot repeat across Slayer games.
        */
        if (
            combo.type === "Slayer" &&
            usedSlayerMaps.includes(combo.map)
        ) {
            return false;
        }

        /*
            If we reach here, combo is legal.
        */
        return true;
    }

    /*
        =====================================
        NORMAL RESTRICTIONS
        =====================================

        These are fallback protections.
    */

    /*
        OBJ maps cannot repeat.
    */
    if (
        combo.type === "OBJ" &&
        usedObjMaps.includes(combo.map)
    ) {
        return false;
    }

    /*
        Slayer maps cannot repeat.
    */
    if (
        combo.type === "Slayer" &&
        usedSlayerMaps.includes(combo.map)
    ) {
        return false;
    }

    /*
        =====================================
        OPTIONAL SINGLE REPEAT LOGIC
        =====================================

        Allows ONE repeat if none exist yet.
        (Currently mostly unused because BO7 logic returns early above.)
    */

    if (usedMaps.includes(combo.map)) {

        if (hasMapRepeat(session)) {
            return false;
        }

        return true;
    }

    /*
        Otherwise legal.
    */
    return true;
}

module.exports = {
    isLegalPick,
    hasMapRepeat
};