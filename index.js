const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { raidChannelId, startRaid } = require("./config.json");

// Token from environment variable
const token = process.env.TOKEN;

if (!token) {
  console.error("TOKEN env variable not found! Set it sa Render Environment Variables!");
  process.exit(1);
}

// Raid rotation
const raids = ["Insect", "Igris", "Elves", "Goblin", "Subway", "Infernal"];
let currentIndex = raids.indexOf(startRaid);
if (currentIndex === -1) currentIndex = 0; // fallback

// Role to mention in RAID UPDATE
const roleId = "1459992956743188623"; // replace with your actual ROLE ID

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkTimeAndPost, 1000); // check every second
});

let lastPostedQuarter = null; // prevent duplicate posts per quarter

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

  // Track quarter-hour to prevent multiple posts
  const currentQuarter = `${hour}:${minute}`;
  if (lastPostedQuarter === currentQuarter) return; // already posted
  lastPostedQuarter = currentQuarter;

  const channel = await client.channels.fetch(raidChannelId).catch(err => {
    console.error("Failed to fetch channel:", err);
  });
  if (!channel) return;

  if (minute === 0 || minute === 30) {
    // RAID UPDATE
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
<@&${roleId}>
`;

    await channel.send(message).catch(err => console.error("Failed to send message:", err));

    // Advance rotation AFTER posting
    currentIndex = (currentIndex + 1) % raids.length;

  } else {
    // REMINDER at :15/:45 (no ping, no rotation change)
    const reminderMessage = `⏰ RAID Reminder! Get ready for the next raid!`;
    await channel.send(reminderMessage).catch(err => console.error("Failed to send reminder:", err));
  }
}

client.login(token);
