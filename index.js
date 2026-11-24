require('dotenv').config();
const {Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, Events} = require('discord.js');
const Database = require('better-sqlite3');
if (!process.env.DISCORD_TOKEN) throw new Error('Missing DISCORD_TOKEN in .env');
const db = new Database('bot.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS afk(user_id TEXT PRIMARY KEY, message TEXT NOT NULL, since INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS warnings(id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, mod_id TEXT NOT NULL, reason TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS config(guild_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(guild_id,key));
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,user_id TEXT,reporter_id TEXT,reason TEXT,created INTEGER);
`);
const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
const pick = a => a[Math.floor(Math.random()*a.length)];
const getConfig=(g,k)=>db.prepare('SELECT value FROM config WHERE guild_id=? AND key=?').get(g,k)?.value;
const setConfig=(g,k,v)=>db.prepare('INSERT INTO config(guild_id,key,value) VALUES(?,?,?) ON CONFLICT(guild_id,key) DO UPDATE SET value=excluded.value').run(g,k,v);
const ephemeral = content => ({content,ephemeral:true});
client.once(Events.ClientReady,c=>console.log(`Ready: ${c.user.tag}`));
client.on(Events.MessageCreate, async m=>{
 if(m.author.bot || !m.guild) return;
 const afk=db.prepare('SELECT message FROM afk WHERE user_id=?').get(m.author.id);
 if(afk) { db.prepare('DELETE FROM afk WHERE user_id=?').run(m.author.id); m.reply('Welcome back! Your AFK status has been cleared.').catch(()=>{}); }
 for(const u of m.mentions.users.values()){
  const row=db.prepare('SELECT message FROM afk WHERE user_id=?').get(u.id);
  if(row) m.reply(`${u.tag} is AFK: ${row.message}`).catch(()=>{});
 }
});
client.on(Events.InteractionCreate, async i=>{
 if(!i.isChatInputCommand()) return;
 const root=i.commandName, sub=i.options.getSubcommand(false), action=[root,sub].filter(Boolean).join(' ');
 const user=i.options.getUser('user');
 try {
  if(root==='ping') return i.reply(ephemeral(`Pong! Gateway latency: ${client.ws.ping}ms`));
  if(root==='bot') return i.reply({embeds:[new EmbedBuilder().setTitle('Bot information').setThumbnail(client.user.displayAvatarURL()).addFields({name:'Uptime',value:`${Math.floor(client.uptime/1000)} seconds`},{name:'Servers',value:String(client.guilds.cache.size)},{name:'Latency',value:`${client.ws.ping}ms`})]});
  if(root==='8ball') return i.reply(pick(['It is certain.','Without a doubt.','Yes.','Ask again later.','Cannot predict now.','My reply is no.','Signs point to yes.']));
  if(root==='coinflip') return i.reply(pick(['🪙 Heads!','🪙 Tails!']));
  if(root==='choose') { const raw=i.options.getString('options'); if(!raw) return i.reply(ephemeral('Use `/choose` with a comma-separated options value after adding that option in the command builder.')); return i.reply(`🎯 ${pick(raw.split(',').map(x=>x.trim()).filter(Boolean))}`); }
  if(root==='afk') { const msg=i.options.getString('status')||'AFK'; db.prepare('INSERT INTO afk(user_id,message,since) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET message=excluded.message,since=excluded.since').run(i.user.id,msg,Date.now()); return i.reply(ephemeral(`AFK enabled: ${msg}`)); }
  if(root==='purge') {
    if(!i.memberPermissions.has(PermissionFlagsBits.ManageMessages)) return i.reply(ephemeral('You need Manage Messages permission.'));
    const amount=i.options.getInteger('amount'); await i.deferReply({ephemeral:true});
    const deleted=await i.channel.bulkDelete(amount,true); return i.editReply(`Deleted ${deleted.size} messages. Messages older than 14 days cannot be bulk-deleted.`);
  }
  if(['whois','info','avatar'].includes(root)) {
    const target=user||i.user; const member=await i.guild.members.fetch(target.id).catch(()=>null);
    if(root==='avatar') return i.reply(target.displayAvatarURL({size:1024}));
    const e=new EmbedBuilder().setTitle(target.tag).setThumbnail(target.displayAvatarURL({size:256})).addFields(
      {name:'User ID',value:target.id},{name:'Account created',value:`<t:${Math.floor(target.createdTimestamp/1000)}:F>`},
      {name:'Joined server',value:member?.joinedTimestamp?`<t:${Math.floor(member.joinedTimestamp/1000)}:F>`:'Not in this server'},
      {name:'Roles',value:member?member.roles.cache.filter(r=>r.id!==i.guild.id).map(r=>r.name).slice(0,15).join(', ')||'None':'N/A'}
    ); return i.reply({embeds:[e]});
  }
  if(root==='serverinfo') {
    const g=i.guild; const e=new EmbedBuilder().setTitle(g.name).setThumbnail(g.iconURL()).addFields(
      {name:'Members',value:String(g.memberCount),inline:true},{name:'Channels',value:String(g.channels.cache.size),inline:true},
      {name:'Created',value:`<t:${Math.floor(g.createdTimestamp/1000)}:D>`}
    ); return i.reply({embeds:[e]});
  }
  if(root==='membercount') return i.reply(`👥 **${i.guild.memberCount}** members`);
  if(root==='warn') {
    if(!i.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) return i.reply(ephemeral('You need Moderate Members permission.'));
    const reason=i.options.getString('reason')||'No reason provided';
    db.prepare('INSERT INTO warnings(guild_id,user_id,mod_id,reason,created) VALUES(?,?,?,?,?)').run(i.guildId,user.id,i.user.id,reason,Date.now());
    return i.reply(`${user.tag} was warned. Reason: ${reason}`);
  }
  if(['timeout','untimeout','kick','ban'].includes(root)) {
    const perm={timeout:PermissionFlagsBits.ModerateMembers,untimeout:PermissionFlagsBits.ModerateMembers,kick:PermissionFlagsBits.KickMembers,ban:PermissionFlagsBits.BanMembers}[root];
    if(!i.memberPermissions.has(perm)) return i.reply(ephemeral(`You need the ${root} permission.`));
    const member=await i.guild.members.fetch(user.id).catch(()=>null); if(!member) return i.reply(ephemeral('Member not found.'));
    const reason=i.options.getString('reason')||`Action by ${i.user.tag}`;
    if(root==='timeout') await member.timeout(10*60*1000,reason);
    if(root==='untimeout') await member.timeout(null,reason);
    if(root==='kick') await member.kick(reason);
    if(root==='ban') await member.ban({reason});
    return i.reply(`${user.tag}: ${root} completed.`);
  }
  if(root==='unban') {
    if(!i.memberPermissions.has(PermissionFlagsBits.BanMembers)) return i.reply(ephemeral('You need Ban Members permission.'));
    await i.guild.members.unban(i.options.getString('user_id')); return i.reply('User unbanned.');
  }
  if(root==='lock') {
    if(!i.memberPermissions.has(PermissionFlagsBits.ManageChannels)) return i.reply(ephemeral('You need Manage Channels permission.'));
    await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:false}); return i.reply('🔒 Channel locked.');
  }
  if(root==='unlock') {
    if(!i.memberPermissions.has(PermissionFlagsBits.ManageChannels)) return i.reply(ephemeral('You need Manage Channels permission.'));
    await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:null}); return i.reply('🔓 Channel unlocked.');
  }
  if(root==='config' && sub==='doctor') {
    const me=await i.guild.members.fetchMe(); const missing=me.permissions.missing([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.EmbedLinks,PermissionFlagsBits.ManageMessages]);
    return i.reply(ephemeral(missing.length?`Missing bot permissions: ${missing.join(', ')}`:'Basic bot permissions look good.'));
  }
  if(root==='config' && sub==='panel') return i.reply(ephemeral('Setup checklist: invite the bot with the required permissions, run `/config doctor`, then configure channels/roles. Feature-specific setup commands are being added.'));
  if(root==='report') {
    const reason=i.options.getString('reason')||'No reason supplied';
    const result=db.prepare('INSERT INTO reports(guild_id,user_id,reporter_id,reason,created) VALUES(?,?,?,?,?)').run(i.guildId,user?.id||null,i.user.id,reason,Date.now());
    return i.reply(ephemeral(`Report #${result.lastInsertRowid} saved for server staff.`));
  }
  if(root==='timestamp') {
    const now=Math.floor(Date.now()/1000); return i.reply(`Discord timestamp: \`<t:${now}:F>\` · Relative: \`<t:${now}:R>\``);
  }
  if(root==='giveaway') return i.reply(ephemeral('Giveaway engine requires a configured giveaway channel and prize workflow; this command is listed but not yet active in this build.'));
  return i.reply(ephemeral(`\`${action}\` is included in the command catalogue. This feature needs its workflow/configuration implemented; it is not falsely marked as complete. See README for the active command list.`));
 } catch(err) {
  console.error(err);
  const payload=ephemeral(`Command failed: ${String(err.message||err).slice(0,1500)}`);
  if(i.deferred||i.replied) await i.followUp(payload).catch(()=>{}); else await i.reply(payload).catch(()=>{});
 }
});
client.login(process.env.DISCORD_TOKEN);
