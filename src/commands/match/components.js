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

const { getTeams } = require('../../teamLoader');

function buildSetupComponents(session) {

    const matchTypeSelect = new StringSelectMenuBuilder()
        .setCustomId("match_type_select")
        .setPlaceholder("Select Match Type")
        .addOptions(
            { label: "Regular Season", value: "Regular Season",   default: session.matchType === "Regular Season" },
            { label: "Playoff",        value: "Playoff",   default: session.matchType === "Playoff" },
            { label: "Scrimmage",      value: "Scrimmage", default: session.matchType === "Scrimmage" }
        );

    const teamSelectA = new StringSelectMenuBuilder()
        .setCustomId("team_select_a")
        .setPlaceholder("Select HIGHER SEED (Team A)")
        .addOptions(
            getTeams().map(team => ({
                ...team,
                default: session.teamA?.id === team.value.split("|")[1]
            }))
        );

    const teamSelectB = new StringSelectMenuBuilder()
        .setCustomId("team_select_b")
        .setPlaceholder("Select LOWER SEED (Team B)")
        .addOptions(
            getTeams().map(team => ({
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
        .setDisabled(!(session.matchType && session.teamA && session.teamB && session.seriesLength));

    return [
        new ActionRowBuilder().addComponents(matchTypeSelect),
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

    // 
    // Admin button to skip scheduling and jump straight to draft (for testing purposes only)
    //  

    // const skipButton = new ButtonBuilder()
    //     .setCustomId("skip_schedule")
    //     .setLabel("⏩ Skip to Draft (Test)")
    //     .setStyle(ButtonStyle.Danger);

    return [
        new ActionRowBuilder().addComponents(proposeButton, /*skipButton*/ )
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

// Returns next 14 days as select options
function buildDateSelectComponents() {
    const options = [];
    const now = new Date();

    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    for (let i = 1; i <= 14; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const label = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        options.push({ label, value });
    }

    const dateSelect = new StringSelectMenuBuilder()
        .setCustomId("schedule_date_select")
        .setPlaceholder("📅 Select a date")
        .addOptions(options);

    return [new ActionRowBuilder().addComponents(dateSelect)];
}

// Returns time slots every 30 min from 12pm to 11:30pm
function buildTimeSelectComponents(dateValue) {
    const earlyOptions = [];
    const lateOptions = [];

    for (let h = 12; h <= 23; h++) {
        for (const m of [0, 15, 30, 45]) {
            const hour12 = h === 12 ? 12 : h - 12;
            const minStr = String(m).padStart(2, "0");

            const option = {
                label: `${hour12}:${minStr}pm`,
                value: `${dateValue}|${String(h).padStart(2, "0")}:${minStr}`
            };

            if (h < 18) earlyOptions.push(option);
            else lateOptions.push(option);
        }
    }

    // Add midnight as 12:00am
    lateOptions.push({
        label: "12:00am",
        value: `${dateValue}|24:00`
    });

    const earlySelect = new StringSelectMenuBuilder()
        .setCustomId("schedule_time_select_early")
        .setPlaceholder("🕐 Select a time: Noon - 5:45pm")
        .addOptions(earlyOptions);

    const lateSelect = new StringSelectMenuBuilder()
        .setCustomId("schedule_time_select_late")
        .setPlaceholder("🕐 Select a time: 6:00pm - Midnight")
        .addOptions(lateOptions);

    return [
        new ActionRowBuilder().addComponents(earlySelect),
        new ActionRowBuilder().addComponents(lateSelect)
    ];
}

// Timezone selector
function buildTimezoneSelectComponents(dateTimeValue) {
    const tzSelect = new StringSelectMenuBuilder()
        .setCustomId("schedule_tz_select")
        .setPlaceholder("🌐 Select your timezone")
        .addOptions(
            { label: "Eastern (EST/EDT)",  value: `${dateTimeValue}|America/New_York` },
            { label: "Central (CST/CDT)",  value: `${dateTimeValue}|America/Chicago` },
            { label: "Mountain (MST/MDT)", value: `${dateTimeValue}|America/Denver` },
            { label: "Pacific (PST/PDT)",  value: `${dateTimeValue}|America/Los_Angeles` },
            { label: "UTC",                value: `${dateTimeValue}|UTC` }
        );

    return [new ActionRowBuilder().addComponents(tzSelect)];
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
    buildDateSelectComponents,
    buildTimeSelectComponents,
    buildTimezoneSelectComponents,
    buildDraftComponents
};