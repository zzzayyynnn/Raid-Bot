// index.js
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const { raidChannelId, startRaid } = require("./config.json");

// --- Discord Bot Token ---
const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN env variable not found! Set it in Render Environment Variables!");
  process.exit(1);
}

// --- Discord Bot Setup ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Portal rotation
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];
let currentIndex = raids.indexOf(startRaid);
if (currentIndex === -1) currentIndex = 0; // fallback

// Role to mention in PORTAL UPDATE
const roleId = "1459992956743188623"; // replace with your actual ROLE ID

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000); // check every second
});

// --- Prevent multiple posts ---
let lastPostedTimestamp = 0; // exact timestamp of last post

async function checkTimeAndPost() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH UTC+8
  const hour = phTime.getHours();
  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  // Trigger only at exact 0 second
  if (second !== 0) return;

  // Only at :00, :15, :30, :45
  if (![0, 15, 30, 45].includes(minute)) return;

  // Use a timestamp for the current quarter to prevent duplicate posts
  const currentQuarterTimestamp = phTime.setSeconds(0, 0);
  if (lastPostedTimestamp === currentQuarterTimestamp) return; // already posted
  lastPostedTimestamp = currentQuarterTimestamp;

  const channel = await client.channels.fetch(raidChannelId).catch(err => {
    console.error("Failed to fetch channel:", err);
  });
  if (!channel) return;

  if (minute === 0 || minute === 30) {
    // PORTAL UPDATE
    const currentPortal = raids[(currentIndex + 1) % raids.length];
    const nextPortal = raids[(currentIndex + 2) % raids.length];

    const message = `
🔥 PORTAL UPDATE 🔥 

🗡️ Current Portal: 
➤ **${currentPortal}**

⏭️ Next Portal: 
➤ **${nextPortal}**

💪 Motivation:
➤ No fear. No retreat. Only victory.

⏰ Prepare yourselves. 
<@&${roleId}>
`;

    await channel.send(message).catch(err => console.error("Failed to send message:", err));

    // Advance rotation AFTER posting
    currentIndex = (currentIndex + 1) % raids.length;

  } else {
    // REMINDER at :15/:45 (no ping, no rotation change)
    const reminderMessage = `⏰ PORTAL Reminder! Get ready for the next portal!`;
    await channel.send(reminderMessage).catch(err => console.error("Failed to send reminder:", err));
  }
}

// --- Express Dummy Server for Render ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Discord Bot is running ✅"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- Login Discord Bot ---
client.login(token);
