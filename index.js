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

// ================= FIXED 24H DUNGEON SCHEDULE (PH TIME) =================
const dungeonSchedule = {
  "00:00": "Igris",
  "00:30": "Demon Castle",
  "01:00": "Elves",
  "01:30": "Goblin",
  "02:00": "Subway",
  "02:30": "Infernal",
  "03:00": "Insect",
  "03:30": "Igris",
  "04:00": "Demon Castle",
  "04:30": "Elves",
  "05:00": "Goblin",
  "05:30": "Subway",
  "06:00": "Infernal",
  "06:30": "Insect",
  "07:00": "Igris",
  "07:30": "Demon Castle",

  // 🔥 8:00 AM SKIP (Elves skipped → Goblin)
  "08:00": "Goblin",
  "08:30": "Subway",
  "09:00": "Infernal",
  "09:30": "Insect",
  "10:00": "Igris",
  "10:30": "Demon Castle",
  "11:00": "Elves",
  "11:30": "Goblin",

  "12:00": "Subway",
  "12:30": "Infernal",
  "13:00": "Insect",
  "13:30": "Igris",
  "14:00": "Demon Castle",
  "14:30": "Elves",
  "15:00": "Goblin",
  "15:30": "Subway",
  "16:00": "Infernal",
  "16:30": "Insect",
  "17:00": "Igris",
  "17:30": "Demon Castle",
  "18:00": "Elves",
  "18:30": "Goblin",
  "19:00": "Subway",
  "19:30": "Infernal",
  "20:00": "Insect",
  "20:30": "Igris",
  "21:00": "Demon Castle",
  "21:30": "Elves",
  "22:00": "Goblin",
  "22:30": "Subway",
  "23:00": "Infernal",
  "23:30": "Insect",
};

// ================= IMAGES =================
const dungeonImages = {
  Goblin:
    "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway:
    "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Infernal:
    "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect:
    "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
  Igris:
    "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842979/image.png",
  Elves:
    "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
  "Demon Castle":
    "https://cdn.discordapp.com/attachments/1410965755742130247/1463577590039183431/image.png",
};

// ================= ROLE IDS =================
const raidRoles = {
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Infernal: "1460130564353953872",
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Elves: "1460131344205218018",
  "Demon Castle": "1463579366566138042",
};

// ================= STATE =================
let reminderMessage = null;
let pingSent = false;
let lastActiveSlot = null;
let lastReminderSlot = null;

// ================= TIME HELPERS =================
function getPHTime() {
  const now = new Date();
  return new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + 8,
    now.getUTCMinutes(),
    now.getUTCSeconds()
  );
}

function formatHM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getNextSlot(time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + 30, 0, 0);
  return formatHM(d);
}

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER =================
async function postReminder(channel, dungeon, secondsLeft) {
  pingSent = false;

  const format = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      Math.floor(s % 60)
    ).padStart(2, "0")}`;

  const updateEmbed = async () => {
    const red = secondsLeft <= 180;

    const embed = new EmbedBuilder()
      .setColor(red ? 0xff0000 : 0x11162a)
      .setTitle("「 SYSTEM WARNING 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**🗡️ UPCOMING DUNGEON**",
          `> ${dungeon}`,
          "",
          `⏱️ Starts in: ${format(secondsLeft)}`,
          red ? "🔴 **RED ALERT!**" : "",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[dungeon])
      .setTimestamp();

    if (!reminderMessage) {
      reminderMessage = await channel.send({ embeds: [embed] });
    } else {
      await reminderMessage.edit({ embeds: [embed] });
    }
  };

  await updateEmbed();

  const timer = setInterval(async () => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(timer);
      return;
    }

    if (secondsLeft === 180 && !pingSent && raidRoles[dungeon]) {
      pingSent = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    await updateEmbed();
  }, 1000);
}

// ================= MAIN LOOP =================
async function mainLoop() {
  const ph = getPHTime();
  const m = ph.getMinutes();
  const s = ph.getSeconds();
  const slot = `${m}-${s}`;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  // ===== ACTIVE (:00 / :30) =====
  if (s === 0 && (m === 0 || m === 30)) {
    if (lastActiveSlot === slot) return;
    lastActiveSlot = slot;

    const timeKey = formatHM(ph);
    const active = dungeonSchedule[timeKey];
    if (!active) return;

    const next = dungeonSchedule[getNextSlot(timeKey)];

    await channel.send({
      embeds: [
        new EmbedBuilder()
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
          .setTimestamp(),
      ],
    });

    reminderMessage = null;
    pingSent = false;
  }

  // ===== REMINDER (:20 / :50) =====
  if (s === 0 && (m === 20 || m === 50)) {
    if (lastReminderSlot === slot) return;
    lastReminderSlot = slot;

    const base = new Date(ph);
    base.setMinutes(m === 20 ? 30 : 60, 0, 0);

    const upcomingTime = formatHM(base);
    const upcoming = dungeonSchedule[upcomingTime];
    if (!upcoming) return;

    const secondsLeft = (base - ph) / 1000;
    await postReminder(channel, upcoming, secondsLeft);
  }
}

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
