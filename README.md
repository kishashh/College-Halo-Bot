# College Halo Bot

The official Discord bot for the College Halo League. Manages match drafts, scheduling, and team administration.

---

## Features

- **Match Draft System** — BO5/BO7 calculated draft with bans, picks, and a Game 7 map ban phase
- **Series Graphic** — Canvas-rendered match graphic sent automatically on draft completion
- **Match Scheduling** — In-Discord time proposal and acceptance flow with automatic timezone display
- **Private Match Channels** — Automatically creates a private channel for each match with only the relevant players and admin
- **Team Management** — Admin commands to create, edit, and delete teams stored in a persistent JSON file
- **League Integration** — Posts completed match schedules to the league web app via API on draft completion
- **Random Series Generator** — `/bo3`, `/bo5`, `/bo7` commands for quick random series generation

---

## Commands

| Command | Description | Access |
|---|---|---|
| `/match` | Create a new league match draft | Admin |
| `/createteam` | Add a new team to the league | Admin |
| `/editteam` | Edit an existing team's name, captain, or color | Admin |
| `/deleteteam` | Remove a team from the league | Admin |
| `/bo3` | Generate a random BO3 series graphic | Everyone |
| `/bo5` | Generate a random BO5 series graphic | Everyone |
| `/bo7` | Generate a random BO7 series graphic | Everyone |

---

## Match Flow

1. Admin runs `/match` and selects match type, Team A, Team B, and series length
2. A private match channel is created under **Pending Matches**
3. Both team captains are pinged to propose a match time using the dropdown scheduler
4. The opposing captain accepts or counter-proposes
5. Once a time is confirmed the draft starts automatically
6. Each captain picks and bans using the dropdown menu — the bot pings the next picker each turn
7. On draft completion a series graphic is posted and the match is submitted to the league system

---

## Setup

### Prerequisites
- Node.js v18+
- A Discord bot token
- `@napi-rs/canvas` for image generation

### Installation

```bash
git clone https://github.com/kishashh/College-Halo-Bot.git
cd College-Halo-Bot
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_IDS=your_guild_id
TEAMS_PATH=./data/teams.json
```

### Register Commands

```bash
node src/register-commands.js
```

### Run

```bash
node src/index.js
```

---

## Asset Structure

```
assets/
├── maps/        # Map images (e.g. Aquarius.png)
├── modes/       # Game mode icons (e.g. Slayer.png)
├── teams/       # Team logos (e.g. OU.png)
├── fonts/       # Custom fonts for canvas rendering
└── ref/         # Background image for series graphic
```

---

## Team Data

Teams are stored in `data/teams.json`. Each team has the following shape:

```json
{
    "label": "OU",
    "value": "OU|DISCORD_ID_OF_CAPTAIN",
    "color": "#841617"
}
```

Teams can be managed at runtime using the `/createteam`, `/editteam`, and `/deleteteam` commands.

---

## Roadmap

### Planned Features

- **Standings Command** — `/standings` pulls from the web app and displays a league table with wins, losses, and map differential
- **Match Reminders** — Automatic pings 24 hours and 1 hour before a confirmed match time
- **Session Persistence** — Store active draft sessions in MongoDB so drafts survive bot restarts
- **Roster Command** — `/roster` displays a team's players, captain, and current record
- **Upcoming Matches** — `/schedule` shows the next week of confirmed matches from the web app

### UX Improvements

- **Draft Graphic** — Replace TBD placeholders on unpicked slots with a dimmed locked state
- **Setup Flow** — Auto-filter Team B dropdown to exclude the already selected Team A
- **Match Channel** — Pin the confirmed match time and add a visual divider between scheduling and draft phases
- **Error Messages** — Replace generic errors with specific actionable messages
- **Bot Status** — Dynamically set bot status to reflect active match count

---

## Tech Stack

- [Discord.js](https://discord.js.org/) v14
- [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) — server-side image rendering
- Node.js / Express
- MongoDB Atlas (planned)
- Railway (hosting)
