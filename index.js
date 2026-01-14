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
const raids = ["Goblin", "Subway", "Elves", "Igris", "Infernal", "Insect"];
let currentIndex = 0;

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
let pingPostedAtFive = false;
let lastTick = null;

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER =================
async function postReminder(channel, dungeon) {
  let minutes = 10;
  pingPostedAtFive = false;

  const embed = new EmbedBuilder()
    .setColor(0x11162a)
    .setTitle("「 SYSTEM WARNING 」")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━",
        "**🗡️ UPCOMING DUNGEON**",
        `> ${dungeon}`,
        "",
        `⏱️ Starts in: ${minutes} min`,
        "_Prepare yourselves, hunters!_",
        "━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setImage(dungeonImages[dungeon])
    .setTimestamp();

  lastReminderMessage = await channel.send({ embeds: [embed] });

  const interval = setInterval(async () => {
    minutes--;

    // 🔔 POST ROLE PING AT EXACTLY 5 MINUTES
    if (minutes === 5 && !pingPostedAtFive) {
      pingPostedAtFive = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    const isRed = minutes <= 3;

    if (minutes === 1) {
      clearInterval(interval);
      let seconds = 60;

      const secInterval = setInterval(async () => {
        seconds--;

        const secEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("「 SYSTEM WARNING 」")
          .setDescription(
            [
              "━━━━━━━━━━━━━━━━━━",
              "**🗡️ UPCOMING DUNGEON**",
              `> ${dungeon}`,
              "",
              `⏱️ Starts in: ${seconds}s`,
              "🔴 **RED ALERT!**",
              "_Prepare yourselves, hunters!_",
              "━━━━━━━━━━━━━━━━━━",
            ].join("\n")
          )
          .setImage(dungeonImages[dungeon])
          .setTimestamp();

        await lastReminderMessage.edit({ embeds: [secEmbed] });

        if (seconds <= 0) clearInterval(secInterval);
      }, 1000);

    } else {
      const update = new EmbedBuilder()
        .setColor(isRed ? 0xff0000 : 0x11162a)
        .setTitle("「 SYSTEM WARNING 」")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━",
            "**🗡️ UPCOMING DUNGEON**",
            `> ${dungeon}`,
            "",
            `⏱️ Starts in: ${minutes} min`,
            isRed ? "🔴 **RED ALERT!**" : "",
            "_Prepare yourselves, hunters!_",
            "━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setImage(dungeonImages[dungeon])
        .setTimestamp();

      await lastReminderMessage.edit({ embeds: [update] });
    }
  }, 60000);
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

  // ACTIVE DUNGEON
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

    currentIndex = (currentIndex + 1) % raids.length;
    lastReminderMessage = null;
  }

  // REMINDER
  if (s === 0 && (m === 20 || m === 50)) {
    if (!lastReminderMessage) {
      await postReminder(channel, next);
    }
  }
}

// ================= EXPRESS =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ================= LOGIN =================
client.login(token);
