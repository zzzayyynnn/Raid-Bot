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
// Subway → Infernal → Insect → Igris → Demon Castle → Elves → Goblin
const raids = [
  "Subway",
  "Infernal",
  "Insect",
  "Igris",
  "Demon Castle",
  "Elves",
  "Goblin",
];

// 🔥 START SETUP
// 👉 FIRST ACTIVE = DEMON CASTLE
let currentIndex = raids.indexOf("Demon Castle");
let lastActiveIndex = currentIndex;

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

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`First ACTIVE => ${raids[currentIndex]}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER =================
async function postReminder(channel, dungeon, secondsLeft) {
  pingSent = false;

  const format = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

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
  const now = new Date();

  // ✅ USE UTC + PH OFFSET ONCE (NO DRIFT)
  const ph = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + 8,
    now.getUTCMinutes(),
    now.getUTCSeconds()
  );

  const m = ph.getMinutes();
  const s = ph.getSeconds();

  const slot = `${m}-${s}`;
  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  // ===== ACTIVE (:00 / :30 EXACT) =====
  if (s === 0 && (m === 0 || m === 30)) {
    if (lastActiveSlot === slot) return;
    lastActiveSlot = slot;

    lastActiveIndex = currentIndex;
    const active = raids[lastActiveIndex];
    const next = raids[(lastActiveIndex + 1) % raids.length];

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

    currentIndex = (currentIndex + 1) % raids.length;
    reminderMessage = null;
    pingSent = false;
  }

  // ===== REMINDER (:20 / :50 EXACT) =====
  if (s === 0 && (m === 20 || m === 50)) {
    if (lastReminderSlot === slot) return;
    lastReminderSlot = slot;

    const upcoming = raids[(lastActiveIndex + 1) % raids.length];
    const targetMinute = m === 20 ? 30 : 0;

    const secondsLeft =
      (targetMinute - m + (targetMinute <= m ? 60 : 0)) * 60;

    await postReminder(channel, upcoming, secondsLeft);
  }
}

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
