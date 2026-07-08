# 🔧 Fix Netlify Auto-Deployment from GitHub

## 🚨 Issue: Changes pushed to GitHub aren't deploying to Netlify automatically

## ✅ Quick Fix Steps:

### 1. **Check Netlify Dashboard**
- Go to: `app.netlify.com`
- Find your `ssk-music-site` 
- Check **Site Settings → Build & Deploy → Continuous Deployment**
- Verify **GitHub branch is `main`**
- Check **"Automatic deploys" is enabled**

### 2. **Check GitHub Webhook**
- Go to your GitHub repo: `github.com/sskmusic7/ssk-music-site`
- Click **Settings → Webhooks**
- Look for Netlify webhook
- If missing or disabled, click **"Add webhook"**
- Use URL: `https://api.netlify.com/hooks/github`

### 3. **Reconnect Netlify to GitHub**
- In Netlify Dashboard: **Site Settings → Build & Deploy**
- Click **"Edit settings"** under "Build & deploy"
- Click **"Reconnect to GitHub"**
- Authorize Netlify access
- Select `sskmusic7/ssk-music-site` repository
- Select `main` branch

### 4. **Test Auto-Deployment**
```bash
# Make a small test change
echo "<!-- Test deployment -->" >> index.html
git add index.html
git commit -m "Test auto-deployment"
git push origin main
```

- Check Netlify Dashboard → **Deploys**
- Should see new deployment start automatically

## 🚨 Temporary Manual Fix (While fixing auto-deploy):

### Option A: Manual FTP Upload
1. Download FTP client (FileZilla)
2. Connect to your hosting
3. Upload these files:
   - `index.html`
   - `contact.html`

### Option B: Netlify Manual Deploy
1. Go to Netlify Dashboard
2. Select your site
3. Click **"Deploy site"** → **"Manual deploy"**
4. Upload your files

### Option C: Clear Cache & Redeploy
1. Netlify Dashboard → **Deploys**
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**

## 🔍 Debug Commands:

```bash
# Check git remote
git remote -v

# Check recent commits
git log --oneline -3

# Check if Netlify is linked
netlify status
```

## 📋 Configuration Checklist:

- ✅ `netlify.toml` has `publish = "."` 
- ✅ GitHub webhook is active
- ✅ Netlify connected to correct repo
- ✅ Auto-deploy enabled for `main` branch
- ✅ No build failures in Netlify dashboard

## 🎯 Most Common Issues:

1. **Webhook disconnected** → Reconnect GitHub in Netlify
2. **Wrong branch** → Set to `main` instead of `master`
3. **Build command missing** → For static sites, use empty build command
4. **Netlify site deleted** → Recreate and reconnect

## 🚀 Once Fixed:

After fixing auto-deployment, all your `git push` commands will trigger automatic Netlify deployments!