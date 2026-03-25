# Influencer Video Tracking Dashboard

MERN-stack application that tracks Instagram Reels and TikTok video metrics using Apify.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Apify account with API token

### 1. Server

```bash
cd server
npm install
```

Edit `server/.env` with your real credentials:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/influencer_tracker
APIFY_TOKEN=<your-token>
APIFY_ACTOR_ID=<your-actor-id>
```

Start the server:

```bash
npm run dev
```

### 2. Client

```bash
cd client
npm install
npm start
```

The React app runs on `http://localhost:3000` and proxies API calls to port 5000.

---

## API Endpoints

| Method | Endpoint                        | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| GET    | `/api/videos`                   | List all tracked videos            |
| POST   | `/api/videos`                   | Add a single video                 |
| POST   | `/api/videos/bulk`              | Bulk-add URLs                      |
| DELETE | `/api/videos/:id`               | Remove a video                     |
| PATCH  | `/api/videos/:id/status`        | Toggle active/paused               |
| GET    | `/api/metrics`                  | Get metrics (filter by videoId)    |
| GET    | `/api/metrics/latest`           | Latest metric per video            |
| GET    | `/api/metrics/campaign-overview`| Aggregate campaign stats           |
| GET    | `/api/metrics/daily-views`      | Daily time-series for charts       |
| GET    | `/api/metrics/top-creators`     | Top 10 creators by views           |
| POST   | `/api/metrics/scrape-now`       | Trigger an immediate scrape        |
| POST   | `/api/upload/excel`             | Upload Excel/CSV file              |
| POST   | `/api/upload/google-sheet`      | Import from a Google Sheet URL     |

---

## Features

- **Video Registry** – add URLs manually, via Excel upload, or from Google Sheets
- **Daily Cron Scraper** – runs at 2 AM, sends ALL URLs in one Apify request
- **Viral Detection** – flags videos whose views doubled since yesterday
- **Dashboard** – campaign overview, daily trends chart, top creators chart, full video table
- **Video Detail** – click any row to see historical metrics and charts
