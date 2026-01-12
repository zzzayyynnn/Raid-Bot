const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const { raidChannelId } = require("./config.json");

// --- Discord Bot Token ---
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found! Set it in Render Environment Variables!");
  process.exit(1);
}

// --- Discord Client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- RAID ROTATION ---
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];

// ✅ Setup current index base sa last posted portal
// I assume last posted = Igris at 1:00 PM → so next = Elves
let currentIndex = raids.indexOf("Elves"); // first post when bot starts = Elves
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

// --- Prevent double posts ---
let lastPostedQuarter = null;

// --- READY ---
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000); // check every second
});

// --- MAIN LOOP ---
async function checkTimeAndPost() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH UTC+8

  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  if (second !== 0) return;
  if (![0, 15, 30, 45].includes(minute)) return;

  // unique key per quarter: YYYYMMDDHHMM
  const currentQuarter = phTime.getFullYear().toString() +
                         (phTime.getMonth() + 1).toString().padStart(2,'0') +
                         phTime.getDate().toString().padStart(2,'0') +
                         phTime.getHours().toString().padStart(2,'0') +
                         minute.toString().padStart(2,'0');

  if (lastPostedQuarter === currentQuarter) return; // already posted
  lastPostedQuarter = currentQuarter;

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  // --- PORTAL UPDATE ---
  if (minute === 0 || minute === 30) {
    const currentPortal = raids[currentIndex]; // ✅ actual current
    const nextPortal = raids[(currentIndex + 1) % raids.length];

    const roleId = raidRoles[currentPortal];
    const rolePing = roleId ? `<@&${roleId}>` : "";

    const message = `
🌀 PORTAL UPDATE 🌀

🗡️ Current Portal: 
➤ **${currentPortal}**

⏭️ Next Portal: 
➤ **${nextPortal}**

💪➤  No fear. No retreat. Only victory.

⏰ Prepare yourselves. 
🔔 ${rolePing}
    `;

    await channel.send(message);

    // advance rotation AFTER posting
    currentIndex = (currentIndex + 1) % raids.length;

  } 
  // --- REMINDER ---
  else {
    await channel.send("⏰ **PORTAL Reminder!** Get ready for the next portal!");
  }
}

// --- EXPRESS SERVER (RENDER) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Discord Bot is running ✅"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- LOGIN ---
client.login(token);
