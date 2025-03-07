# marketing-dashboard-api

## Overview
This Node.js application scrapes the follower count of the Witnet's LinkedIn, Discord, Telegram, Medium and Twitter  and serves it through a simple Express API. The data is cached for 12 hours by default to reduce unnecessary requests.

## Features
- Fetches follower count from LinkedIn.
- Caches data for 12 hours to improve performance.
- Provides a JSON API endpoint at `/`.

## Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Version 22 recommended)
- [Docker](https://www.docker.com/) (optional, for containerization)

## Installation
1. Clone this repository:
   ```sh
   git clone git@github.com:witnet/marketing-dashboard-api.git
   cd 
   ```
2. Install dependencies:
   ```sh
   pnpm install
   ```
3. Start the application:
   ```sh
   node index.js
   ```

## Running with Docker
1. Build the Docker image:
   ```sh
   docker build -t marketing-dashboard-api .
   ```
2. Run the container:
   ```sh
   docker run -p 3000:3000 marketing-dashboard-api
   ```

## Usage
- Open `http://localhost:3000/` in your browser or use `curl`:
  ```sh
  curl http://localhost:3000/
  ```
- The API will return the follower count in JSON format.
