import { load } from "cheerio"
import { Client, GatewayIntentBits } from "discord.js"
import TelegramBot from "node-telegram-bot-api"

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WITNET_DISCORD_TOKEN = process.env.WITNET_DISCORD_TOKEN

const CACHE_DURATION_MS = process.env.CACHE_DURATION_MS || 60 * 60 * 12000 // 12 hour in milliseconds
const cache = {}

// Function to get LinkedIn followers count
async function getLinkedInFollowers() {
  try {
    const response = await fetch("https://www.linkedin.com/company/witnet/", {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
      },
    })

    const data = await response.text()

    const $ = load(data)

    // Find the followers count element
    // Expected "San Francisco, CA  2,847,935 followers"
    const followersText = $("h3").first().text().trim()

    return followersText
      .replaceAll(",", "")
      .split(" ")
      .find((x) => Number.parseInt(x))
  } catch (error) {
    console.error("Error:", error.message)
    return null
  }
}

// Function to get Medium followers count
async function getMediumFollowers() {
  try {
    const response = await fetch("https://medium.com/witnet/followers/", {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
      },
    })

    const data = await response.text()

    const $ = load(data)

    // Find the followers count element
    // Expected "35 followers" or "1.2k followers"
    const followersText = $("h2").first().text().trim()
    const followers = followersText.split(" ")[0] || 0

    return followers.includes("k") ? followers.replace("k", "000") : followers
  } catch (error) {
    console.error("Error:", error.message)
    return null
  }
}

async function getDiscordServerdMembers() {
  return new Promise((resolve) => {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    })

    client.once("ready", () => {
      let members = 0
      client.guilds.cache.forEach((guild) => {
        members += guild.memberCount
      })

      resolve(members)
    })

    client.login(WITNET_DISCORD_TOKEN)
  })
}

// Function to get the number of members in Witnet's Telegram group
async function getTelegramMembers(botToken) {
  const bot = new TelegramBot(botToken, { polling: false })
  try {
    const count = await bot.getChatMemberCount("@witnetio")
    return count.toString()
  } catch (error) {
    console.error("[TELEGRAM] Error fetching member count:", error.message)
    return null
  }
}

// Function to get the number of followers for a user by user ID
async function getFollowersCount(userId) {
  try {
    const response = await fetch(`https://api.twitter.com/2/users/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
      },
    })
    if (response.status !== 200) {
      throw new Error(`Failed to fetch twitter data: ${response.status}`)
    }
    const json = await response.json()
    return json?.data?.public_metrics?.followers_count
  } catch (error) {
    console.error("[TWITTER] Error getting followers count:", error)
    return null
  }
}

async function getTwitterFollowers() {
  try {
    // Get the user ID from the username
    // const userId = await getUserId(username);
    const userId = "955794358242029568"

    // Get the number of followers
    const followersCount = await getFollowersCount(userId)
    return followersCount
  } catch (error) {
    console.error("Error:", error)
    return null
  }
}

// Generic caching function
async function fetchWithCache(key, fetchFunction) {
  const now = Date.now()

  if (!cache[key] || now - cache[key].lastFetchTime > CACHE_DURATION_MS) {
    console.log(`Fetching data for ${key}`)
    try {
      const data = await fetchFunction()
      cache[key] = { data, lastFetchTime: now }
    } catch (error) {
      console.error(`Error fetching data for ${key}`, error)
      return { error: error.message }
    }
  } else {
    console.log(`Using cached data for ${key}`)
  }

  return cache[key].data
}

// LAMBDA HANDLER
export const handler = async (_event) => {
  const [linkedin, medium, discord, telegram, twitter] = await Promise.all([
    fetchWithCache("linkedin", getLinkedInFollowers),
    fetchWithCache("medium", getMediumFollowers),
    fetchWithCache("discord", getDiscordServerdMembers),
    fetchWithCache("telegram", () => getTelegramMembers(TELEGRAM_BOT_TOKEN)),
    //fetchWithCache("twitter", getTwitterFollowers),
  ])

  const response = {
    statusCode: 200,
    body: {
      linkedin,
      medium,
      discord,
      telegram,
      twitter: null,
      time: Date.now(),
    },
  }
  return response
}
