const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { raidChannelId, startRaid } = require("./config.json");

// Token from environment variable
const token = process.env.TOKEN;

if (!token) {
  console.error("TOKEN env variable not found! Set it sa Render Environment Variables!");
  process.exit(1);
}

// Raid list rotation
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];
let currentIndex = raids.indexOf(startRaid);
if (currentIndex === -1) currentIndex = 0; // fallback

// User to mention in raid posts
const userId = "1459992956743188623";

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000); // check every second
});

let lastPostedMinute = null; // prevent duplicate posts

async function checkTimeAndPost() {
  const now = new Date();
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // PH UTC+8
  const hour = phTime.getHours();
  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  // Only trigger at exact 0 second
  if (second !== 0) return;

  // Only at :00, :15, :30, :45
  if (![0, 15, 30, 45].includes(minute)) return;

  // Avoid duplicate posts per minute
  if (lastPostedMinute === minute) return;
  lastPostedMinute = minute;

  const channel = await client.channels.fetch(raidChannelId).catch(err => {
    console.error("Failed to fetch channel:", err);
  });
  if (!channel) return;

  if (minute === 0 || minute === 30) {
    // Normal raid post
    const currentRaid = raids[currentIndex];
    const nextRaid = raids[(currentIndex + 1) % raids.length];

    const message = `
🔥 RAID UPDATE 🔥

🗡️ Current Raid:
➤ ${currentRaid}

⏭️ Next Raid:
➤ ${nextRaid}

💪 Motivation:
➤ No fear. No retreat. Only victory.

⏰ Prepare yourselves. 
<@${userId}>
`;

    channel.send(message).catch(err => console.error("Failed to send message:", err));

    // Advance rotation only AFTER posting at :30 or :00
    currentIndex = (currentIndex + 1) % raids.length;

  } else {
    // :15/:45 → Reminder only, no mention, no rotation change
    const reminderMessage = `⏰ RAID Reminder! Get ready for the next raid!`;
    channel.send(reminderMessage).catch(err => console.error("Failed to send reminder:", err));
  }
}

client.login(token);
