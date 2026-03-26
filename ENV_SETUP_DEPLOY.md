# SSK Music Website - Environment Variables Setup

## ✅ DONE: API Keys Removed from Code

All hardcoded API keys have been removed. The site now uses **Netlify Functions** with environment variables.

---

## 📋 Deployment Steps

### Step 1: Deploy to Netlify

Drag and drop the `ssk-music-site` folder to Netlify.

### Step 2: Add Environment Variables

After deploying, you MUST add the environment variables in Netlify:

1. Go to your site in Netlify dashboard
2. Click **Site Settings** → **Environment Variables**
3. Click **Add a variable**

Add these variables:

| Key | Value |
|-----|-------|
| `YOUTUBE_API_KEY` | `AIzaSyArj-6mjGFUJXBbXwnpq6xukb5jKeGj-7E` |
| `YOUTUBE_PLAYLIST_ID` | `PL60PtskKjky1r3e9iFacHX_laEZAxxE71` |

### Step 3: Redeploy

After adding environment variables:
- Go to **Deploys** → Click **Trigger Deploy** → **Deploy site**

---

## How It Works Now

```
Browser → Netlify Function (/api/stats) → YouTube API
               ↑
         Uses ENV vars (hidden)
```

- ✅ API keys are **hidden** in server-side code
- ✅ No secrets in browser/client-side code
- ✅ Netlify function calls YouTube API securely
- ✅ Falls back to 38M/17M if API fails

---

## File Structure

```
ssk-music-site/
├── index.html              (No API keys - calls /api/stats)
├── netlify.toml            (Config for functions)
└── netlify/
    └── functions/
        └── stats.mjs       (Uses process.env.YOUTUBE_API_KEY)
```

---

## Testing Locally (Optional)

If you want to test locally:

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Create `.env` file in ssk-music-site:
   ```
   YOUTUBE_API_KEY=AIzaSyArj-6mjGFUJXBbXwnpq6xukb5jKeGj-7E
   YOUTUBE_PLAYLIST_ID=PL60PtskKjky1r3e9iFacHX_laEZAxxE71
   ```
3. Run: `netlify dev`
4. Open: http://localhost:8888
