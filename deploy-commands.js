require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const entries = require('./catalog');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  throw new Error('Set DISCORD_TOKEN and CLIENT_ID in .env first.');
}
const safe = s => s.toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,32);
const grouped = new Map();
for (const [path, description] of entries) {
  const [root, ...parts] = path.split(' ');
  if (!grouped.has(root)) grouped.set(root, []);
  grouped.get(root).push({parts, description});
}
const commands = [];
for (const [root, children] of grouped) {
  const b = new SlashCommandBuilder().setName(safe(root)).setDescription((children[0]?.description || root).slice(0,100));
  if (children.length === 1 && children[0].parts.length === 0) {
    if (root === 'purge') b.addIntegerOption(o=>o.setName('amount').setDescription('Messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true));
    if (root === '8ball') b.addStringOption(o=>o.setName('question').setDescription('Ask a question').setRequired(true));
    if (root === 'afk') b.addStringOption(o=>o.setName('status').setDescription('Your AFK message').setMaxLength(1800));
    if (['whois','info','avatar'].includes(root)) b.addUserOption(o=>o.setName('user').setDescription('Target member'));
    if (['warn','timeout','untimeout','kick','ban'].includes(root)) {
      b.addUserOption(o=>o.setName('user').setDescription('Target member').setRequired(true));
      b.addStringOption(o=>o.setName('reason').setDescription('Reason').setMaxLength(500));
    }
    if (root==='unban') b.addStringOption(o=>o.setName('user_id').setDescription('Discord user ID').setRequired(true));
  } else {
    for (const item of children) {
      const sub = safe(item.parts.join('-') || 'run');
      b.addSubcommand(s=>s.setName(sub).setDescription(item.description.slice(0,100)));
    }
  }
  commands.push(b.toJSON());
}
(async()=>{
 const rest = new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
 const route = process.env.GUILD_ID
   ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
   : Routes.applicationCommands(process.env.CLIENT_ID);
 await rest.put(route,{body:commands});
 console.log(`Registered ${commands.length} top-level slash commands.`);
})();
