import "dotenv/config"

import { handler } from "./index.js"

const event = {} // Simulated Lambda event

handler(event).then(console.log).catch(console.error)
