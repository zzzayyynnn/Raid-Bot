const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// --- Discord Bot Token ---
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found! Set it in Render Environment Variables!");
  process.exit(1);
}

// --- CHANNEL ID ---
const raidChannelId = "1459967642621448316"; // Updated channel

// --- Discord Client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// --- RAID ROTATION ---
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];

// ✅ STARTING PORTAL = IGRIS
let currentIndex = raids.indexOf("Igris");
if (currentIndex === -1) currentIndex = 0;

// --- RAID ROLE IDS (Updated) ---
const raidRoles = {
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Infernal: "1460130564353953872",
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Elves: "1460131344205218018",
};

// --- Prevent double posts ---
let lastPostedQuarter = null;

// --- READY ---
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000);
});

// --- MAIN LOOP ---
async function checkTimeAndPost() {
  const now = new Date();

  // PH Time (UTC+8)
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  if (second !== 0) return;
  if (![0, 15, 30, 45].includes(minute)) return;

  // Unique key per quarter to prevent double post
  const currentQuarter =
    phTime.getFullYear() +
    String(phTime.getMonth() + 1).padStart(2, "0") +
    String(phTime.getDate()).padStart(2, "0") +
    String(phTime.getHours()).padStart(2, "0") +
    String(minute).padStart(2, "0");

  if (lastPostedQuarter === currentQuarter) return;
  lastPostedQuarter = currentQuarter;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  const currentPortal = raids[currentIndex];
  const nextPortal = raids[(currentIndex + 1) % raids.length];

  // --- PORTAL UPDATE (00 & 30) ---
  if (minute === 0 || minute === 30) {
    const roleId = raidRoles[currentPortal];
    const rolePing = roleId ? `<@&${roleId}>` : "";

    const portalMessage = `
╔════════〔 PORTAL UPDATE 〕════════╗
║ ▶ CURRENT DUNGEON : ${currentPortal}
║ ▷ NEXT DUNGEON    : ${nextPortal}
║
║ ⚔️ No fear. No retreat. Only victory.
║ 🛡️ Be ready, hunters… your hunt begins.
╚═══════════════════════════════════╝
${rolePing}
`;

    await channel.send(portalMessage);

    // Move to next portal **after posting**
    currentIndex = (currentIndex + 1) % raids.length;
  }
  // --- REMINDER (15 & 45) ---
  else {
    const upcomingPortal = raids[currentIndex]; // show the portal that will come next
    const reminderMessage = `───〔 HUNTER ALERT 〕─── Be ready, hunters… your hunt begins — next dungeon: ${upcomingPortal}`;
    await channel.send(reminderMessage);
  }
}

// --- EXPRESS SERVER (RENDER KEEP-ALIVE) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord Bot is running ✅");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- LOGIN ---
client.login(token);
