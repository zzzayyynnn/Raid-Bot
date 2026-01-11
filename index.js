const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { token, raidChannelId, startRaid } = require("./config.json");

// Raid list
const raids = ["Goblin", "Subway", "Infernal", "Insect", "Igris", "Elves"];
let currentIndex = raids.indexOf(startRaid);

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Check every second for exact posting times
  setInterval(checkTimeAndPost, 1000);
});

async function checkTimeAndPost() {
  const now = new Date();

  // Philippine Time UTC+8
  const phTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const minute = phTime.getMinutes();
  const second = phTime.getSeconds();

  // Only post exactly at 0 second
  if (second !== 0) return;

  // Only post at :00, :15, :30, :45
  if (minute % 15 !== 0) return;

  const channel = await client.channels.fetch(raidChannelId);
  if (!channel) return;

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
`;

  channel.send(message);

  // Change raid only at :00 and :30
  if (minute === 0 || minute === 30) {
    currentIndex = (currentIndex + 1) % raids.length;
  }
}

client.login(token);
