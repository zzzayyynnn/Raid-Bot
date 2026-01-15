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
const raids = ["Goblin", "Subway", "Infernal", "Insect", "Igris", "Elves"];

// ================= IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842979/image.png",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
};

// ================= ROLE IDS =================
const raidRoles = {
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Infernal: "1460130564353953872",
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Elves: "1460131344205218018",
};

// ================= STATE =================
function loadState() {
  if (!fs.existsSync(stateFile)) {
    return {
      currentIndex: 1, // 🔥 START WITH SUBWAY
    };
  }
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}

function saveState() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

let state = loadState();
let lastReminderMessage = null;
let pingPostedAtThree = false;
let lastTick = null;

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Starting ACTIVE dungeon: ${raids[state.currentIndex]}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER =================
async function postReminder(channel, dungeon, secondsLeft) {
  pingPostedAtThree = false;

  const format = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const sendOrEdit = async () => {
    const isRed = secondsLeft <= 180;

    const embed = new EmbedBuilder()
      .setColor(isRed ? 0xff0000 : 0x11162a)
      .setTitle("「 SYSTEM WARNING 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**🗡️ UPCOMING DUNGEON**",
          `> ${dungeon}`,
          "",
          `⏱️ Starts in: ${format(secondsLeft)}`,
          isRed ? "🔴 **RED ALERT!**" : "",
          "_Prepare yourselves, hunters!_",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[dungeon])
      .setTimestamp();

    if (!lastReminderMessage) {
      lastReminderMessage = await channel.send({ embeds: [embed] });
    } else {
      await lastReminderMessage.edit({ embeds: [embed] });
    }
  };

  await sendOrEdit();

  const interval = setInterval(async () => {
    secondsLeft--;

    if (secondsLeft <= 0) {
      clearInterval(interval);
      return;
    }

    if (secondsLeft === 180 && !pingPostedAtThree) {
      pingPostedAtThree = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    await sendOrEdit();
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

  const active = raids[state.currentIndex];
  const upcoming = raids[(state.currentIndex + 1) % raids.length];

  // ===== ACTIVE POST (:00 / :30) =====
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
          `> ${upcoming}`,
          "----------------------",
          "Your dungeon has spawned. Hunters, be ready.",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[active])
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    state.currentIndex = (state.currentIndex + 1) % raids.length;
    lastReminderMessage = null;
    saveState();
  }

  // ===== UPCOMING REMINDER (:20 / :50) =====
  if (s === 0 && (m === 20 || m === 50)) {
    if (!lastReminderMessage) {
      const targetMinute = m === 20 ? 30 : 0;
      const secondsLeft =
        ((targetMinute - m + (targetMinute <= m ? 60 : 0)) * 60) - s;

      await postReminder(channel, upcoming, secondsLeft);
    }
  }
}

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
