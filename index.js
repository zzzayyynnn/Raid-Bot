const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const { raidChannelId, startRaid } = require("./config.json");

// --- Discord Bot Token ---
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found! Set it in Render Environment Variables!");
  process.exit(1);
}

// --- Discord Client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// --- RAID ROTATION ---
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];

let currentIndex = raids.indexOf(startRaid);
if (currentIndex === -1) currentIndex = 0;

// --- RAID ROLE IDS ---
const raidRoles = {
  Insect: "1460130634000236769",
  Igris: "1460130485702365387",
  Infernal: "1460130564353953872",
  Goblin: "1460130693895159982",
  Subway: "1460130735175499862",
  Elves: "1460131344205218018",
};

// --- READY ---
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000); // check every second
});

// --- PREVENT DUPLICATE POSTS ---
let lastPostedTimestamp = 0;

// --- MAIN LOOP ---
async function checkTimeAndPost() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH time

  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  // Only exact 0 second
  if (second !== 0) return;

  // Only quarter hours
  if (![0, 15, 30, 45].includes(minute)) return;

  const currentQuarterTimestamp = phTime.setSeconds(0, 0);
  if (lastPostedTimestamp === currentQuarterTimestamp) return;
  lastPostedTimestamp = currentQuarterTimestamp;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  // --- PORTAL UPDATE ---
  if (minute === 0 || minute === 30) {
    const currentPortal = raids[(currentIndex + 1) % raids.length];
    const nextPortal = raids[(currentIndex + 2) % raids.length];

    const roleId = raidRoles[currentPortal];
    const rolePing = roleId ? `<@&${roleId}>` : "";

    const message = `
🔥 **PORTAL UPDATE** 🔥

🗡️ **Current Portal**
➤ **${currentPortal}**

⏭️ **Next Portal**
➤ **${nextPortal}**

💪 No fear. No retreat. Only victory.

${rolePing}
    `;

    await channel.send(message);

    // advance rotation AFTER posting
    currentIndex = (currentIndex + 1) % raids.length;

  } 
  // --- REMINDER ---
  else {
    await channel.send(
      "⏰ **PORTAL Reminder!** Get ready for the next portal!"
    );
  }
}

// --- EXPRESS SERVER (RENDER) ---
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
