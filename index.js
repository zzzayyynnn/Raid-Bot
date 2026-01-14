const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

// ================= CONFIG =================
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found!");
  process.exit(1);
}

const raidChannelId = "1459967642621448316"; // ✅ updated raid channel

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ================= RAID ROTATION =================
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];
let currentIndex = raids.indexOf("Igris"); // First active dungeon = Igris

// ================= ROLE IDS =================
const raidRoles = {
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Infernal: "1460130564353953872",
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Elves: "1460131344205218018",
};

// ================= THUMBNAILS / IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842977/image.png",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
};

// ================= PREVENT DOUBLE POST =================
let lastPostedQuarter = null;
let lastReminderMessage = null;

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000);
});

// ================= HELPER: POST LIVE COUNTDOWN REMINDER =================
async function postCountdownReminder(channel, nextPortal) {
  let totalSeconds = 10 * 60; // 10 minutes in seconds
  const rolePingText = raidRoles[nextPortal] ? `<@&${raidRoles[nextPortal]}>` : "";

  lastReminderMessage = await channel.send({ embeds: [buildCountdownEmbed(nextPortal, totalSeconds)] });

  const interval = setInterval(async () => {
    totalSeconds--;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Ping when 5 minutes or less
    let ping = totalSeconds <= 5 * 60 ? rolePingText : "";

    // RED ALERT when 3 minutes or less
    let redAlert = totalSeconds <= 3 * 60 ? "🔴 **RED ALERT!**" : "";

    const updatedEmbed = buildCountdownEmbed(nextPortal, totalSeconds, redAlert);

    if (lastReminderMessage) await lastReminderMessage.edit({ content: ping, embeds: [updatedEmbed] });

    if (totalSeconds <= 0) clearInterval(interval);
  }, 1000);
}

// Helper to build the embed dynamically
function buildCountdownEmbed(dungeon, totalSeconds, alertText = "") {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const color = totalSeconds <= 3 * 60 ? 0xff0000 : 0x11162a;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle("「 SYSTEM WARNING 」")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━",
        "**🗡️ UPCOMING DUNGEON**",
        `> ${dungeon}`,
        "",
        `⏱️ Starts in: ${minutes}m ${seconds}s`,
        alertText,
        "_Prepare yourselves, hunters!_",
        "━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setImage(dungeonImages[dungeon])
    .setTimestamp();
}

// ================= MAIN LOOP =================
async function checkTimeAndPost() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH time

  const hour = phTime.getHours();
  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  const currentPortal = raids[currentIndex];
  const nextPortal = raids[(currentIndex + 1) % raids.length];

  const currentQuarter =
    phTime.getFullYear() +
    String(phTime.getMonth() + 1).padStart(2, "0") +
    String(phTime.getDate()).padStart(2, "0") +
    String(hour).padStart(2, "0") +
    String(minute).padStart(2, "0");

  if (lastPostedQuarter === currentQuarter) return;
  lastPostedQuarter = currentQuarter;

  // ================= ACTIVE DUNGEON =================
  if (second === 0 && (minute === 0 || minute === 30)) {
    const rolePing = raidRoles[currentPortal] ? `<@&${raidRoles[currentPortal]}>` : "";

    const embed = new EmbedBuilder()
      .setColor(0x05070f)
      .setTitle("「 SYSTEM — DUNGEON STATUS 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**⚔️ ACTIVE DUNGEON**",
          `> ${currentPortal}`,
          "",
          "**➡️ NEXT DUNGEON**",
          `> ${nextPortal}`,
          "━━━━━━━━━━━━━━━━━━",
          "_Your dungeon has spawned. Hunters,\nbe ready—only the strong survive._",
        ].join("\n")
      )
      .setImage(dungeonImages[currentPortal])
      .setFooter({ text: "ARISE." })
      .setTimestamp();

    await channel.send({ content: rolePing, embeds: [embed] });

    currentIndex = (currentIndex + 1) % raids.length;
    lastReminderMessage = null; // reset reminder tracker
    return;
  }

  // ================= REMINDER POSTS =================
  if (second === 0 && (minute === 20 || minute === 50)) {
    if (!lastReminderMessage) {
      await postCountdownReminder(channel, nextPortal);
    }
  }
}

// ================= EXPRESS (KEEP ALIVE) =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
