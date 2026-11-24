# Harvey-style Discord Bot — Full Update

This is an **original, Harvey-inspired implementation** based on the 27 screenshots supplied in the conversation. It is not Harvey's original source code and does not include Harvey's private backend/API/database.

## What API/key do I need?
**No third-party API key is required.** You need only your own Discord application's **Bot Token** and **Application (Client) ID**:
1. Open https://discord.com/developers/applications
2. Create an application, open **Bot**, and create/reset its token.
3. Copy the token into your local `.env` as `DISCORD_TOKEN`.
4. Copy the Application ID from **General Information** into `CLIENT_ID`.

Never send the token in chat, commit it to GitHub, or put it in source code. The token previously pasted into the chat should be treated as compromised: reset it in the Developer Portal before using this project.

## Requirements
- Node.js 20.11+
- A Discord application/bot
- Bot invited with the permissions needed for the commands you enable

## Run locally
```bash
npm install
cp .env.example .env
# edit .env locally; do not upload it
npm run deploy
npm start
```
On Windows, create `.env` manually by copying `.env.example`.

## GitHub upload
1. Create a **Private** repository.
2. Extract this ZIP on your device.
3. Upload the contents of the `Harvey_Style_Discord_Bot_Full_Update` folder (not the ZIP itself).
4. Do not upload `.env`, `bot.sqlite`, or `node_modules`.
5. For GitHub-hosted deployment, add `DISCORD_TOKEN` and `CLIENT_ID` as repository **Actions secrets** only if you set up a workflow that uses them. Do not commit secrets.

## Current implementation status
Working core commands in this build:
- `/ping`, `/bot`, `/8ball`, `/coinflip`, `/afk`
- `/purge` (Manage Messages permission)
- `/whois`, `/info`, `/avatar`, `/serverinfo`, `/membercount`
- `/warn`, `/timeout`, `/untimeout`, `/kick`, `/ban`, `/unban`
- `/lock`, `/unlock`, `/timestamp`, `/report`
- `/config doctor`, `/config panel` (basic setup helper)

The complete command names visible in the screenshots are included in the slash-command catalogue. Commands whose server-specific workflows are not implemented yet respond honestly that they are catalogue entries, not completed features. Ticketing, staff quota/tokens, LOA, message events, Last-to-Leave, giveaways, birthday automation, connection roles, and channel rules require additional feature modules and server configuration.

## Important Discord Developer Portal settings
- Enable **Server Members Intent** for member lookup.
- Enable **Message Content Intent** if you later add message-based prefix commands.
- Keep the bot role below roles it should not moderate.
- Use least-privilege permissions; do not grant Administrator unless you understand the risk.
