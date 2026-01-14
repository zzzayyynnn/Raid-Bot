const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");
const fs = require("fs");
const path = require("path");

// ================= CONFIG =================
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found!");
  process.exit(1);
}

const raidChannelId = "1459967642621448316";
const stateFile = path.join(__dirname, "state.json");

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ================= RAID ROTATION =================
const raids = ["Subway", "Infernal", "Insect", "Igris", "Elves", "Goblin"];

// ================= LOAD / SAVE STATE =================
function loadState() {
  if (!fs.existsSync(stateFile)) {
    // currentIndex = 2 → first active = Insect
    return { currentIndex: 2, firstReminderDone: false };
  }
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}

function saveState() {
  fs.writeFileSync(stateFile, JSON.stringify({ currentIndex, firstReminderDone }));
}

let { currentIndex, firstReminderDone = false } = loadState();

// ================= ROLE IDS =================
const raidRoles = {
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Infernal: "1460130564353953872",
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Elves: "1460131344205218018",
};

// ================= IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842977/image.png",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
};

let lastReminderMessage = null;
let pingPostedAtThree = false;
let lastTick = null;

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Resuming at dungeon: ${raids[currentIndex]}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER =================
async function postReminder(channel, dungeon) {
  let totalSeconds = 10 * 60;
  pingPostedAtThree = false;

  const format = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const embed = new EmbedBuilder()
    .setColor(0x11162a)
    .setTitle("「 SYSTEM WARNING 」")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━",
        "**🗡️ UPCOMING DUNGEON**",
        `> ${dungeon}`,
        "",
        `⏱️ Starts in: ${format(totalSeconds)}`,
        "_Prepare yourselves, hunters!_",
        "━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setImage(dungeonImages[dungeon])
    .setTimestamp();

  lastReminderMessage = await channel.send({ embeds: [embed] });

  const interval = setInterval(async () => {
    totalSeconds--;

    // 🔔 ROLE PING AT 03:00
    if (totalSeconds === 180 && !pingPostedAtThree) {
      pingPostedAtThree = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    if (totalSeconds <= 0) {
      clearInterval(interval);
      return;
    }

    const isRed = totalSeconds <= 180;

    const update = new EmbedBuilder()
      .setColor(isRed ? 0xff0000 : 0x11162a)
      .setTitle("「 SYSTEM WARNING 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**🗡️ UPCOMING DUNGEON**",
          `> ${dungeon}`,
          "",
          `⏱️ Starts in: ${format(totalSeconds)}`,
          isRed ? "🔴 **RED ALERT!**" : "",
          "_Prepare yourselves, hunters!_",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[dungeon])
      .setTimestamp();

    await lastReminderMessage.edit({ embeds: [update] });
  }, 1000);
}

// ================= MAIN LOOP =================
async function mainLoop() {
  const now = new Date();
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const h = ph.getHours();
  const m = ph.getMinutes();
  const s = ph.getSeconds();

  const tick = `${h}:${m}:${s}`;
  if (tick === lastTick) return;
  lastTick = tick;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  const active = raids[currentIndex];
  const next = raids[(currentIndex + 1) % raids.length];

  // ================= ACTIVE DUNGEON POST (:00 or :30) =================
  if (s === 0 && (m === 0 || m === 30)) {
    const embed = new EmbedBuilder()
      .setColor(0x05070f)
      .setTitle("「 SYSTEM — DUNGEON STATUS 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**⚔️ ACTIVE DUNGEON**",
          `> ${active}`,
          "",
          "**➡️ NEXT DUNGEON**",
          `> ${next}`,
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[active])
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Move rotation forward AFTER posting
    currentIndex = (currentIndex + 1) % raids.length;
    saveState();
    lastReminderMessage = null;
  }

  // ================= REMINDER POST (:20 or :50) =================
  if (s === 0 && (m === 20 || m === 50)) {
    if (!lastReminderMessage) {
      let reminderDungeon;

      if (!firstReminderDone) {
        // FIRST REMINDER SPECIAL CASE: points to Igris
        reminderDungeon = "Igris";
        firstReminderDone = true;
      } else {
        // Reminder should always point to the upcoming active dungeon
        reminderDungeon = raids[currentIndex % raids.length];
      }

      await postReminder(channel, reminderDungeon);
      saveState();
    }
  }
}

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
