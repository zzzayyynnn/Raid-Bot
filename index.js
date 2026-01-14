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
const raids = ["Goblin", "Subway", "Infernal", "Insect", "Igris", "Elves"]; // Goblin first

// ================= IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png?ex=696882f9&is=69673179&hm=f4a597584e31f370290be100819eedd86f8da092df2a233d1fc87a7ff9c3b2c7&",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png?ex=6968831c&is=6967319c&hm=3c4106bb892cd64c8936ee8247d8098d882c7b098291a6ed4a43c34c09c19d7d&",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png?ex=696883f6&is=69673276&hm=6f2788c67304debf88e27c16b6929e1e2d453be2cb3a51b5d624fa7588358e0c&",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png?ex=6968840b&is=6967328b&hm=4ea29e21b84651634ddd43f52ef46d530ff7500b6b332db1f05fb4d0ed1c6764&",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842979/image.png?ex=69688436&is=696732b6&hm=27d6aa926e32ec70c3e3c2bc1063ec0e98097e9ac1cebd2c8f2e24c7569626f3&",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png?ex=696884be&is=6967333e&hm=7e741e96c961c6855e76cca18ca51f8b185e4dd16b6b180772959157637ba828&",
};

// ================= ROLE IDS =================
const raidRoles = {
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Infernal: "1460130564353953872",
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Elves: "1460131344205218018",
};

// ================= LOAD / SAVE STATE =================
function loadState() {
  if (!fs.existsSync(stateFile)) {
    return {
      currentIndex: 0, // start with Goblin
      firstReminderDone: false,
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
let lastNextDungeon = null;

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Resuming at dungeon: ${raids[state.currentIndex]}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER FUNCTION =================
async function postReminder(channel, dungeon, secondsLeft) {
  pingPostedAtThree = false;

  const format = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const embed = new EmbedBuilder()
    .setColor(0x11162a)
    .setTitle("「 SYSTEM WARNING 」")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━",
        "**🗡️ UPCOMING DUNGEON**",
        `> ${dungeon}`,
        "",
        `⏱️ Starts in: ${format(secondsLeft)}`,
        "_Prepare yourselves, hunters!_",
        "━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setImage(dungeonImages[dungeon]) // picture matches the upcoming dungeon
    .setTimestamp();

  if (!lastReminderMessage) {
    lastReminderMessage = await channel.send({ embeds: [embed] });
  } else {
    await lastReminderMessage.edit({ embeds: [embed] });
  }

  const interval = setInterval(async () => {
    secondsLeft--;

    if (secondsLeft <= 0) {
      clearInterval(interval);
      return;
    }

    // 3-minute ping
    if (secondsLeft <= 180 && !pingPostedAtThree) {
      pingPostedAtThree = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    const isRed = secondsLeft <= 180;

    const update = new EmbedBuilder()
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

    try {
      if (lastReminderMessage.editable) {
        await lastReminderMessage.edit({ embeds: [update] });
      } else {
        lastReminderMessage = await channel.send({ embeds: [update] });
      }
    } catch (err) {
      console.error("Failed to update reminder:", err);
    }
  }, 1000);
}

// ================= MAIN LOOP =================
async function mainLoop() {
  const now = new Date();
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH time

  const h = ph.getHours();
  const m = ph.getMinutes();
  const s = ph.getSeconds();

  const tick = `${h}:${m}:${s}`;
  if (tick === lastTick) return;
  lastTick = tick;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  const active = raids[state.currentIndex];
  const next = raids[(state.currentIndex + 1) % raids.length];
  lastNextDungeon = next;

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
          "----------------------",
          "Your dungeon has spawned. Hunters, be ready.",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[active]) // active dungeon picture
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Advance rotation
    state.currentIndex = (state.currentIndex + 1) % raids.length;
    lastReminderMessage = null;
    saveState();
  }

  // ================= REMINDER POST (:20 or :50) =================
  if (s === 0 && (m === 20 || m === 50)) {
    if (!lastReminderMessage) {
      let reminderDungeon;

      if (!state.firstReminderDone) {
        reminderDungeon = raids[state.currentIndex]; // first reminder matches upcoming dungeon
        state.firstReminderDone = true;
      } else {
        reminderDungeon = lastNextDungeon; // subsequent reminders
      }

      const nextDungeonMinute = m === 20 ? 30 : 0;
      const secondsLeft = ((nextDungeonMinute - m + (nextDungeonMinute <= m ? 60 : 0)) * 60) - s;

      await postReminder(channel, reminderDungeon, secondsLeft);
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
