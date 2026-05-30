const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");
const teamList = require('../../data/teams');

const TEAM_COLORS = Object.fromEntries(
    teamList.map(team => [
        team.label,
        team.color
    ])
);


// ─── Asset paths ─────────────────────────────────────────────────────────────
const ASSETS     = path.resolve(__dirname, "../../../assets");
const MAPS_DIR   = path.join(ASSETS, "maps");
const MODES_DIR  = path.join(ASSETS, "modes");
const TEAMS_DIR  = path.join(ASSETS, "teams");
const REF_DIR = path.join(ASSETS, "ref");
const BG_PATH = path.join(REF_DIR, "BGimg.png");

// ─── Layout ───────────────────────────────────────────────────────────────────
const CANVAS_W   = 1200;
const PADDING    = 32;
const HEADER_H   = 100;
const MAP_AREA_H = 380;
const BAN_AREA_H = 160;
const CANVAS_H   = PADDING + HEADER_H + PADDING + MAP_AREA_H + PADDING + BAN_AREA_H + PADDING;

// ─── Colors ───────────────────────────────────────────────────────────────────
const BG                = "#0b0d14";
const SURFACE           = "#00000000";
const MAPMODE_BANNER    = "#ffffff";
const MAP_TEXT          = "#000000";
const MODE_TEXT         = "#c5c5c5";
const TEXT_DIM          = "#ffffff";
const RED_BAN           = "#ff000000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

async function tryLoadImage(filePath) {
    try {
        if (fs.existsSync(filePath)) return await loadImage(filePath);
    } catch (_) {}
    return null;
}

function drawImageCover(ctx, img, x, y, w, h) {
    const imgAspect = img.width / img.height;
    const rectAspect = w / h;
    let sx, sy, sw, sh;
    if (imgAspect > rectAspect) {
        sh = img.height; sw = sh * rectAspect;
        sy = 0; sx = (img.width - sw) / 2;
    } else {
        sw = img.width; sh = sw / rectAspect;
        sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawImageContain(ctx, img, x, y, w, h) {
    const imgAspect = img.width / img.height;
    const rectAspect = w / h;
    let dw, dh;
    if (imgAspect > rectAspect) { dw = w; dh = w / imgAspect; }
    else { dh = h; dw = h * imgAspect; }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawRedX(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(180, 20, 30, 0.55)";
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.strokeStyle = RED_BAN;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    const pad = 20;
    ctx.beginPath();
    ctx.moveTo(x + pad, y + pad);
    ctx.lineTo(x + w - pad, y + h - pad);
    ctx.moveTo(x + w - pad, y + pad);
    ctx.lineTo(x + pad, y + h - pad);
    ctx.stroke();
    ctx.restore();
}

/**
 * Renders the series graphic.
 *
 * @param {object} data
 * @param {string} data.teamA           e.g. "OU"
 * @param {string} data.teamB           e.g. "OU"
 * @param {string} [data.teamAColor]    hex accent for team A (default blue)
 * @param {string} [data.teamBColor]    hex accent for team B (default orange)
 * @param {number} data.bestOf          3 | 5 | 7
 * @param {Array}  data.games           picked maps:
 *   [{ map: "Aquarius", mode: "Oddball", pickedBy: "A"|"B" }]
 * @param {Array}  data.teamABans       [{ map: "Fortress", mode: "CTF" }]
 * @param {Array}  data.teamBBans       [{ map: "Recharge", mode: "Slayer" }]
 * @returns {Promise<Buffer>} PNG buffer
 */

async function renderSeriesGraphic(data) {
    const {
        teamA, teamB,
        teamAColor = TEAM_COLORS[teamA],
        teamBColor = TEAM_COLORS[teamB],
        bestOf,
        games = [],
        teamABans = [],
        teamBBans = [],
    } = data;

    const canvas = createCanvas(CANVAS_W, CANVAS_H);
    const ctx = canvas.getContext("2d");

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const bgImg = await tryLoadImage(BG_PATH);

    if (bgImg) {
        drawImageCover(ctx, bgImg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  
    const topGrad = ctx.createLinearGradient(0, 0, CANVAS_W, 0);

    // softer, wider team glows
    topGrad.addColorStop(0.00, teamAColor + "60");
    topGrad.addColorStop(0.47, teamAColor + "40");
    topGrad.addColorStop(0.53, teamBColor + "40");
    topGrad.addColorStop(1.00, teamBColor + "60");

    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── HEADER ────────────────────────────────────────────────────────────────
    const headerY = PADDING;
    const midX    = CANVAS_W / 2;
    const logoSize = 80;
    const logoOffset = 120;

    // Team A logo
    const logoA = await tryLoadImage(path.join(TEAMS_DIR, `${teamA}.png`));

    if (logoA) {
        const drawSize = 110;

        drawImageContain(
            ctx,
            logoA,
            midX - logoOffset - drawSize / 2,
            headerY + HEADER_H / 2 - drawSize / 2,
            drawSize,
            drawSize
        );
    } else {
        ctx.fillStyle = teamAColor + "44";
        ctx.fillRect(
            midX - logoOffset - 40,
            headerY + HEADER_H / 2 - 40,
            80,
            80
        );
    }

    // Team B logo
    const logoB = await tryLoadImage(path.join(TEAMS_DIR, `${teamB}.png`));

    if (logoB) {
        const drawSize = 110;

        drawImageContain(
            ctx,
            logoB,
            midX + logoOffset - drawSize / 2,
            headerY + HEADER_H / 2 - drawSize / 2,
            drawSize,
            drawSize
        );
    } else {
        ctx.fillStyle = teamBColor + "44";
        ctx.fillRect(
            midX + logoOffset - 40,
            headerY + HEADER_H / 2 - 40,
            80,
            80
        );
    }

    // VS
    ctx.font = "bold 30px sans-serif";
    ctx.fillStyle = TEXT_DIM;
    ctx.textAlign = "center";
    ctx.fillText("VS", midX, headerY + HEADER_H / 2 + 7);

    // BO label
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = MODE_TEXT;
    ctx.fillText(`BEST OF ${bestOf}`, midX, headerY + HEADER_H / 2 + 24);

    // ── MAP CARDS ─────────────────────────────────────────────────────────────
    const cardsY    = headerY + HEADER_H + PADDING + 20;
    const cardCount = bestOf;
    const seriesGames = Array.from({ length: bestOf }, (_, i) => games[i] || null);
    const cardGap   = 10;
    const cardW     = (CANVAS_W - PADDING * 2 - cardGap * (cardCount - 1)) / cardCount;
    const cardH     = MAP_AREA_H;
    const imageH    = cardH - 80;
    const labelH    = 80;

    for (let i = 0; i < bestOf; i++) {
        const game = seriesGames[i];
        const cardX = PADDING + i * (cardW + cardGap);

        if (!game || !game.map || !game.mode) {

            roundRect(ctx, cardX, cardsY, cardW, cardH, 8);

            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fill();

            ctx.font = "bold 22px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.textAlign = "center";

            ctx.fillText(
                "TBD",
                cardX + cardW / 2,
                cardsY + cardH / 2
            );

            continue;
        }
        
        const teamColor = game.pickedBy === "A" ? teamAColor : teamBColor;

        // card bg
        roundRect(ctx, cardX, cardsY, cardW, cardH, 8);
        ctx.fillStyle = SURFACE;
        ctx.fill();

        // map image (clipped to top portion with rounded top corners)
        const mapImg = await tryLoadImage(path.join(MAPS_DIR, `${game.map}.png`))
                    || await tryLoadImage(path.join(MAPS_DIR, `${game.map}.jpg`));
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cardX + 8, cardsY);
        ctx.lineTo(cardX + cardW - 8, cardsY);
        ctx.quadraticCurveTo(cardX + cardW, cardsY, cardX + cardW, cardsY + 8);
        ctx.lineTo(cardX + cardW, cardsY + imageH);
        ctx.lineTo(cardX, cardsY + imageH);
        ctx.lineTo(cardX, cardsY + 8);
        ctx.quadraticCurveTo(cardX, cardsY, cardX + 8, cardsY);
        ctx.closePath();
        ctx.clip();
        if (mapImg) {
            drawImageCover(ctx, mapImg, cardX, cardsY, cardW, imageH);
            // gradient overlay for label readability
            const g = ctx.createLinearGradient(0, cardsY, 0, cardsY + imageH);
            g.addColorStop(0.5, "rgba(0,0,0,0)");
            g.addColorStop(1,   "rgba(0,0,0,0.65)");
            ctx.fillStyle = g;
            ctx.fillRect(cardX, cardsY, cardW, imageH);
        } else {
            const g = ctx.createLinearGradient(cardX, cardsY, cardX, cardsY + imageH);
            g.addColorStop(0, "#1a2030");
            g.addColorStop(1, "#0d1018");
            ctx.fillStyle = g;
            ctx.fillRect(cardX, cardsY, cardW, imageH);
        }
        ctx.restore();

        // label strip
        const labelY = cardsY + imageH;
        ctx.fillStyle = MAPMODE_BANNER;
        ctx.fillRect(cardX, labelY, cardW, labelH);

        // mode icon (ghost, bottom-right of label)
        const modeImg = await tryLoadImage(path.join(MODES_DIR, `${game.mode}.png`))
                     || await tryLoadImage(path.join(MODES_DIR, `${game.mode}.jpg`));
        if (modeImg) {
            const iconSize = 40;
            ctx.globalAlpha = 0.12;
            drawImageContain(ctx, modeImg,
                cardX + cardW - iconSize - 8, labelY + (labelH - iconSize) / 2,
                iconSize, iconSize);
            ctx.globalAlpha = 1;
        }

        // map name (auto-size to fit card width)
        let mapLabel = game.map.toUpperCase();
        let fontSize = Math.min(18, Math.floor(cardW / 6.5));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "left";
        while (ctx.measureText(mapLabel).width > cardW - 18 && fontSize > 9) {
            fontSize--;
            ctx.font = `bold ${fontSize}px sans-serif`;
        }
        ctx.fillStyle = MAP_TEXT;
        ctx.fillText(mapLabel, cardX + 10, labelY + 30);

        // mode name
        ctx.font = `${Math.max(9, Math.floor(cardW / 12))}px sans-serif`;
        ctx.fillStyle = MODE_TEXT;
        ctx.fillText(game.mode.toUpperCase(), cardX + 10, labelY + 50);

        // team color bar at bottom
        ctx.fillStyle = teamColor;
        ctx.fillRect(cardX, cardsY + cardH - 3, cardW, 3);

        ctx.textAlign = "left";
    }

    // ── BAN SECTION ───────────────────────────────────────────────────────────
    const banAreaY  = cardsY + MAP_AREA_H + PADDING;
    const banCardW  = 170;
    const banCardH  = 120;
    const banImageH = 85;
    const banLabelH = banCardH - banImageH;
    const banGap    = 8;

    // center divider
    ctx.strokeStyle = TEXT_DIM + "AA";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(midX, banAreaY -35);
    ctx.lineTo(midX, banAreaY + BAN_AREA_H -12);
    ctx.stroke();
    ctx.setLineDash([]);

    const banSlotsPerTeam = bestOf === 7 ? 2 : 1;

    const seriesTeamABans = Array.from(
        { length: banSlotsPerTeam },
        (_, i) => teamABans[i] || null
    );

    const seriesTeamBBans = Array.from(
        { length: banSlotsPerTeam },
        (_, i) => teamBBans[i] || null
    );

    async function drawBanCards(bans, startX, dir, label, color) {

        // text above cards
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = color;
        ctx.textAlign = dir === 1 ? "left" : "right";

        const textX = dir === 1
            ? startX
            : startX;

        ctx.fillText(label, textX, banAreaY + 14);

        for (let i = 0; i < bans.length; i++) {
            const ban = bans[i];

            const bx  = dir === 1
                ? startX + i * (banCardW + banGap)
                : startX - i * (banCardW + banGap) - banCardW;

            const by  = banAreaY + 22;

            if (!ban || !ban.map || !ban.mode) {
                roundRect(ctx, bx, by, banCardW, banCardH, 6);
                ctx.fillStyle = "rgba(255,255,255,0.15)";
                ctx.fill();

                ctx.font = "bold 16px sans-serif";
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                ctx.textAlign = "center";
                ctx.fillText("TBD", bx + banCardW / 2, by + banCardH / 2);

                continue;
            }

            roundRect(ctx, bx, by, banCardW, banCardH, 6);
            ctx.fillStyle = SURFACE;
            ctx.fill();

            const mapImg = await tryLoadImage(path.join(MAPS_DIR, `${ban.map}.png`))
                        || await tryLoadImage(path.join(MAPS_DIR, `${ban.map}.jpg`));
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(bx + 6, by);
            ctx.lineTo(bx + banCardW - 6, by);
            ctx.quadraticCurveTo(bx + banCardW, by, bx + banCardW, by + 6);
            ctx.lineTo(bx + banCardW, by + banImageH);
            ctx.lineTo(bx, by + banImageH);
            ctx.lineTo(bx, by + 6);
            ctx.quadraticCurveTo(bx, by, bx + 6, by);
            ctx.closePath();
            ctx.clip();
            if (mapImg) {
                drawImageCover(ctx, mapImg, bx, by, banCardW, banImageH);
            } else {
                ctx.fillStyle = "#111520";
                ctx.fillRect(bx, by, banCardW, banImageH);
            }
            drawRedX(ctx, bx, by, banCardW, banImageH);
            ctx.restore();

            // label strip
            ctx.fillStyle = MAPMODE_BANNER;
            ctx.fillRect(bx, by + banImageH, banCardW, banLabelH);

            // map name
            ctx.font = "bold 10px sans-serif";
            ctx.fillStyle = MAP_TEXT;
            ctx.textAlign = "left";
            let label = ban.map.toUpperCase();
            while (ctx.measureText(label).width > banCardW - 10 && label.length > 3) {
                label = label.slice(0, -1);
            }
            ctx.fillText(label, bx + 6, by + banImageH + 14);

            // mode
            if (ban.mode) {
                ctx.font = "9px sans-serif";
                ctx.fillStyle = MODE_TEXT;
                ctx.fillText(ban.mode.toUpperCase(), bx + 6, by + banImageH + 26);
            }

            // team colored bottom bar
            ctx.fillStyle = color;
            ctx.fillRect(bx, by + banCardH - 3, banCardW, 3);

            ctx.textAlign = "left";
        }
    }


    // await drawBanCards(seriesTeamABans, midX - banGap * 3, -1, "", teamAColor);
    // await drawBanCards(seriesTeamBBans, midX + banGap * 3, 1, "", teamBColor);

    
    await drawBanCards(
        seriesTeamABans,
        midX - banGap * 3,
        -1,
        "",
        teamAColor

    );

    await drawBanCards(
        seriesTeamBBans,
        midX + banGap * 3,
        1,
        "",
        teamBColor

    );

    return canvas.toBuffer("image/png");
}

module.exports = { renderSeriesGraphic };
