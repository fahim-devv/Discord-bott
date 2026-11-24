# GitHub-only setup

## Required GitHub repository secrets
In your repository go to **Settings → Secrets and variables → Actions → New repository secret** and add:

- `DISCORD_TOKEN` = your newly reset Discord bot token (do not use the token previously pasted into chat; reset it first)
- `CLIENT_ID` = `1571119386427785256`

Optional repository variable (not a secret):
- `GUILD_ID` = your test Discord server ID. If omitted, commands are registered globally and can take time to appear.

Then open **Actions → Deploy Discord Slash Commands → Run workflow**. The workflow registers the slash commands. It does NOT keep the bot online.

## Important GitHub limitation
GitHub is source hosting and GitHub Actions is for finite automation jobs. It is not a persistent 24/7 Node.js bot host. This workflow deploys slash commands only; the bot process in `src/index.js` still needs an always-on host or a machine you keep running.

## Local `.env`
For local testing, copy `.env.example` to `.env`, paste the newly reset token locally, and run `npm install`, `npm run deploy`, `npm start`. Never commit `.env`.
