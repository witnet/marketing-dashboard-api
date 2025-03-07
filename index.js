import { load } from "cheerio"
import express from "express"
import TelegramBot from "node-telegram-bot-api"

import 'dotenv/config'

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WITNET_DISCORD_GUILD_ID = process.env.WITNET_DISCORD_GUILD_ID

const app = express()
const port = process.env.PORT || 3000

const CACHE_DURATION_MS = process.env.CACHE_DURATION_MS || 60 * 60 * 12000 // 12 hour in milliseconds
const cache = {}

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

// API endpoints
app.get("/", async (req, res) => {
  const [linkedin, medium, discord, telegram, twitter] = await Promise.all([
    fetchWithCache("linkedin", getLinkedInFollowers),
    fetchWithCache("medium", getMediumFollowers),
    fetchWithCache("discord", getDiscorServerdMembers),
    fetchWithCache("telegram", () => getTelegramMembers(TELEGRAM_BOT_TOKEN)),
    fetchWithCache("twitter", getTwitterFollowers),
  ])

  res.json({
    linkedin,
    medium,
    discord,
    telegram,
    twitter,
  })
})

app.get("/linkedin", async (req, res) => {
  res.json(await fetchWithCache("linkedin", getLinkedInFollowers))
})

app.get("/medium", async (req, res) => {
  res.json(await fetchWithCache("medium", getMediumFollowers))
})

app.get("/discord", async (req, res) => {
  res.json(
    await fetchWithCache("discord", () =>
      getDiscorServerdMembers(WITNET_DISCORD_MEE6_LEADERBOARD),
    ),
  )
})

app.get("/telegram", async (req, res) => {
  res.json(
    await fetchWithCache("telegram", () =>
      getTelegramMembers(TELEGRAM_BOT_TOKEN),
    ),
  )
})

app.get("/twitter", async (req, res) => {
  res.json(await fetchWithCache("twitter", getTwitterFollowers))
})

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

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

async function getMee6LeaderboardDiscord(apiUrl, page = 0) {
  try {
    const response = await fetch(
      `https://mee6.xyz/api/plugins/levels/leaderboard/${WITNET_DISCORD_GUILD_ID}?page=${page}`,
      { method: "GET" },
    )
    const leaderboard = (await response.json()).players

    return leaderboard.length
  } catch (error) {
    console.error(
      "Error fetching leaderboard:",
      error.response?.data || error.message,
    )
    throw error
  }
}

// Fetch multiple pages (first 3 pages)
async function getDiscorServerdMembers() {
  try {
    const maxPages = 100
    let members = 0
    for (let page = 0; page < maxPages; page++) {
      const leaderboard = await getMee6LeaderboardDiscord(page)
      if (leaderboard === 0) {
        break
      }
      members = leaderboard + members
      await new Promise((resolve) => setTimeout(resolve, 100)) // Delay 1 second
    }

    return members.toString()
  } catch (error) {
    console.error("[DISCORD] Error fetching members:", error.message)
    return null
  }
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
    return json.data.public_metrics.followers_count
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

// // Function to get the user ID from the username
// async function getUserId(username) {
//   try {
//     // Example response:
//   //   data: {
//   //   id: '955794358242029568',
//   //   name: 'Witnet - the multichain decentralized oracle',
//   //   username: 'witnet_io'
//   // }

//     const response = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
//       }
//     });
//     const json = await response.json();
//     console.log('json', json)
//     return json.data.id;
//   } catch (error) {
//     console.error('Error getting user ID:', error);
//     throw error;
//     return null
//   }
// }
