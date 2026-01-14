const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

// ================= CONFIG =================
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found!");
  process.exit(1);
}

const raidChannelId = "1459967642621448316";

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ================= RAID ROTATION =================
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];
let currentIndex = raids.indexOf("Igris"); // ✅ FIRST ACTIVE = IGRIS

// ================= ROLE IDS =================
const raidRoles = {
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Elves: "1460131344205218018",
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Infernal: "1460130564353953872",
};

// ================= IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842979/image.png",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
};

// ================= COUNTDOWN GLOBALS =================
let countdownMessage = null;
let countdownInterval = null;
let rolePingSent = false;
let lastMinuteKey = null;

// ================= UTIL =================
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ================= START COUNTDOWN =================
async function startCountdown(channel, dungeon, totalSeconds = 600) {
  // Clear previous countdown
  if (countdownInterval) clearInterval(countdownInterval);
  if (countdownMessage) await countdownMessage.delete().catch(() => {});
  
  let remaining = totalSeconds;
  rolePingSent = false;

  // Create initial embed
  const embed = new EmbedBuilder()
    .setColor(0x11162a)
    .setTitle("「 SYSTEM WARNING 」")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━",
        "**🗡️ UPCOMING DUNGEON**",
        `> ${dungeon}`,
        "",
        "⏳ **Dungeon spawning in**",
        "",
        `**${formatTime(remaining)}**`,
        "",
        "_Prepare yourselves, hunters._",
        "━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setImage(dungeonImages[dungeon])
    .setTimestamp();

  countdownMessage = await channel.send({ embeds: [embed] });

  countdownInterval = setInterval(async () => {
    remaining--;

    // Role ping at 3 minutes
    if (remaining === 180 && !rolePingSent) {
      const roleId = raidRoles[dungeon];
      if (roleId) await channel.send(`🔔 <@&${roleId}> **Dungeon spawns in 03:00!**`);
      rolePingSent = true;
    }

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      countdownMessage = null;
      return;
    }

    // Update only the time and color dynamically
    const danger = remaining <= 60;

    const updatedEmbed = EmbedBuilder.from(embed) // clone original embed
      .setColor(danger ? 0xff0000 : 0x11162a)
      .setTitle(danger ? "⚠️⚠️ SYSTEM ALERT ⚠️⚠️" : "「 SYSTEM WARNING 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          danger ? "**⚠️ DUNGEON IMMINENT ⚠️**" : "**🗡️ UPCOMING DUNGEON**",
          `> ${dungeon}`,
          "",
          danger ? "⚠️ **SPAWNING IN** ⚠️" : "⏳ **Dungeon spawning in**",
          "",
          `**${formatTime(remaining)}**`,
          "",
          danger
            ? "_Stand your ground. Survival is not guaranteed._"
            : "_Prepare yourselves, hunters._",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setTimestamp();

    await countdownMessage.edit({ embeds: [updatedEmbed] }).catch(() => {});
  }, 1000);
}

// ================= MAIN LOOP =================
async function checkTimeAndPost() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  const minuteKey = `${phTime.getHours()}:${minute}:${second}`;
  if (lastMinuteKey === minuteKey) return;
  lastMinuteKey = minuteKey;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  const activeDungeon = raids[currentIndex];
  const nextDungeon = raids[(currentIndex + 1) % raids.length];

  // ⏳ REMINDER :20 / :50
  if (minute === 20 || minute === 50) {
    startCountdown(channel, nextDungeon, 600); // 10-min countdown
  }

  // ⚔️ ACTIVE :00 / :30
  if (minute === 0 || minute === 30) {
    if (countdownInterval) clearInterval(countdownInterval);
    if (countdownMessage) await countdownMessage.delete().catch(() => {});
    countdownInterval = null;
    countdownMessage = null;

    const rolePing = raidRoles[activeDungeon]
      ? `<@&${raidRoles[activeDungeon]}>`
      : "";

    const embed = new EmbedBuilder()
      .setColor(0x05070f)
      .setTitle("「 SYSTEM — DUNGEON STATUS 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**⚔️ ACTIVE DUNGEON**",
          `> ${activeDungeon}`,
          "",
          "**➡️ NEXT DUNGEON**",
          `> ${nextDungeon}`,
          "━━━━━━━━━━━━━━━━━━",
          "_Your dungeon has spawned. Hunters, be ready._",
        ].join("\n")
      )
      .setImage(dungeonImages[activeDungeon])
      .setFooter({ text: "ARISE." })
      .setTimestamp();

    await channel.send({ content: rolePing, embeds: [embed] });

    currentIndex = (currentIndex + 1) % raids.length;
  }
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000);
});

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
