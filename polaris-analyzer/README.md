# Polaris Collab Analyzer

A YouTube influencer collab analysis tool built for **Polaris School of Technology** — evaluates how well paid collab videos serve prospective B.Tech CS students and their parents.

## Project Structure

```
polaris-analyzer/
├── api/
│   └── analyze.js        # Vercel serverless function (Anthropic proxy)
├── public/
│   ├── index.html        # Main analyzer tool
│   └── sample-report.html # Sample report preview
├── vercel.json           # Vercel routing config
└── README.md
```

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/polaris-analyzer.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Leave all build settings as default — Vercel auto-detects the structure
4. Click **Deploy**

### 3. Add your API Key (critical)

After deploying:
1. Go to your project in Vercel dashboard → **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your key from console.anthropic.com)
3. Click **Save**, then go to **Deployments** and **Redeploy** the latest deployment

Your app is now live at `https://your-project.vercel.app` — the API key stays on the server, never exposed to users.

## How It Works

- Users hit the frontend at `/` — no API key required on their end
- When they submit a YouTube URL, the frontend calls `/api/analyze`
- The serverless function reads `ANTHROPIC_API_KEY` from environment and proxies the request to Anthropic
- The analysis JSON is returned to the frontend and rendered

## Local Development

```bash
npm i -g vercel
vercel dev
```

Create a `.env.local` file:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Then open `http://localhost:3000`.
