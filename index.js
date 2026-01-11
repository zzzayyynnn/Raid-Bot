const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { raidChannelId, startRaid } = require("./config.json");

// Get token from environment variable
const token = process.env.TOKEN;

if (!token) {
  console.error("TOKEN env variable not found! Set it sa Render Environment Variables!");
  process.exit(1);
}

// Raid list
const raids = ["Goblin", "Subway", "Infernal", "Insect", "Igris", "Elves"];
const rotationMinutes = 30; // Change raid every 30 mins

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Check every second for exact posting times
  setInterval(checkTimeAndPost, 1000);
});

async function checkTimeAndPost() {
  const now = new Date();

  // Philippine Time UTC+8
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const hour = phTime.getHours();
  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  // Only post exactly at 0 second
  if (second !== 0) return;

  // Only post at :00, :15, :30, :45
  if (![0, 15, 30, 45].includes(minute)) return;

  const channel = await client.channels.fetch(raidChannelId).catch(err => {
    console.error("Failed to fetch channel:", err);
  });
  if (!channel) return;

  let currentRaid;
  let nextRaid;

  // Calculate time-based index for rotation
  // Every 30 minutes = 1 rotation step
  const totalMinutes = hour * 60 + minute;
  let timeIndex = Math.floor(totalMinutes / rotationMinutes) % raids.length;

  if (minute === 15 || minute === 45) {
    // Special case: always Infernal
    currentRaid = "Infernal";
    nextRaid = raids[(timeIndex + 1) % raids.length];
  } else {
    // Normal rotation
    currentRaid = raids[timeIndex];
    nextRaid = raids[(timeIndex + 1) % raids.length];
  }

  const message = `
🔥 RAID UPDATE 🔥

🗡️ Current Raid:
➤ ${currentRaid}

⏭️ Next Raid:
➤ ${nextRaid}

💪 Motivation:
➤ No fear. No retreat. Only victory.

⏰ Prepare yourselves.
`;

  channel.send(message).catch(err => console.error("Failed to send message:", err));
}

client.login(token);
