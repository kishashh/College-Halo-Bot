const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    getLegalPickCombos,
    getLegalBanCombos,
    getLegalGame7MapBans,
    getDraftPrompt
} = require('./draftLogic');

const teamList = require('../../data/teams');

function buildSetupComponents(session) {

    const teamSelectA = new StringSelectMenuBuilder()
        .setCustomId("team_select_a")
        .setPlaceholder("Select HIGHER SEED (Team A)")
        .addOptions(
            teamList.map(team => ({
                ...team,
                default: session.teamA?.id === team.value.split("|")[1]
            }))
        );

    const teamSelectB = new StringSelectMenuBuilder()
        .setCustomId("team_select_b")
        .setPlaceholder("Select LOWER SEED (Team B)")
        .addOptions(
            teamList.map(team => ({
                ...team,
                default: session.teamB?.id === team.value.split("|")[1]
            }))
        );

    const seriesSelect = new StringSelectMenuBuilder()
        .setCustomId("series_length_select")
        .setPlaceholder("Select series length")
        .addOptions(
            { label: "BO5", value: "5", default: session.seriesLength === 5 },
            { label: "BO7", value: "7", default: session.seriesLength === 7 }
        );

    const submitButton = new ButtonBuilder()
        .setCustomId("submit_match")
        .setLabel("Submit Match")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!(session.teamA && session.teamB && session.seriesLength));

    return [
        new ActionRowBuilder().addComponents(teamSelectA),
        new ActionRowBuilder().addComponents(teamSelectB),
        new ActionRowBuilder().addComponents(seriesSelect),
        new ActionRowBuilder().addComponents(submitButton)
    ];
}

function buildScheduleComponents() {
    const proposeButton = new ButtonBuilder()
        .setCustomId("propose_time")
        .setLabel("📅 Propose Time")
        .setStyle(ButtonStyle.Primary);

    return [
        new ActionRowBuilder().addComponents(proposeButton)
    ];
}

function buildScheduleResponseComponents() {
    const acceptButton = new ButtonBuilder()
        .setCustomId("accept_time")
        .setLabel("✅ Accept")
        .setStyle(ButtonStyle.Success);

    const counterButton = new ButtonBuilder()
        .setCustomId("propose_time")
        .setLabel("📅 Counter-Propose")
        .setStyle(ButtonStyle.Secondary);

    return [
        new ActionRowBuilder().addComponents(acceptButton, counterButton)
    ];
}

function buildDraftComponents(session) {

    if (session.phase === "complete") return [];

    let options = [];

    if (session.phase === "initial_bans") {
        options = getLegalBanCombos(session).map(combo => ({
            label: `${combo.mode} - ${combo.map}`,
            value: `BAN|${combo.mode}|${combo.map}`
        }));
    }

    if (session.phase === "picks") {
        options = getLegalPickCombos(session).map(combo => ({
            label: `${combo.mode} - ${combo.map}`,
            value: `PICK|${combo.mode}|${combo.map}`
        }));
    }

    if (session.phase === "extra_g7_ban") {
        options = getLegalGame7MapBans(session).map(map => ({
            label: map,
            value: `MAPBAN|${map}`
        }));
    }

    if (!options.length) return [];

    const select = new StringSelectMenuBuilder()
        .setCustomId("draft_select")
        .setPlaceholder(getDraftPrompt(session))
        .addOptions(options.slice(0, 25));

    return [new ActionRowBuilder().addComponents(select)];
}

module.exports = {
    buildSetupComponents,
    buildScheduleComponents,
    buildScheduleResponseComponents,
    buildDraftComponents
};