# StudyOS — Deployment Guide

## Quick Deploy (Vercel — Recommended)

Vercel is the easiest way to deploy Next.js apps. It's free for personal projects.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/studyos.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Click **Deploy**

Your app will be live at `https://your-project.vercel.app`

### Step 3: Custom Domain (Optional)

1. In Vercel dashboard → your project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Install as Native App (PWA)

Once deployed, the app can be installed on any device like a native app:

### On iPhone/iPad (Safari):
1. Open your deployed URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

### On Android (Chrome):
1. Open your deployed URL in Chrome
2. Tap the **three dots menu**
3. Tap **"Add to Home screen"** or **"Install app"**
4. Confirm

### On Desktop (Chrome/Edge):
1. Open your deployed URL
2. Look for the **install icon** in the address bar (or three dots menu)
3. Click **"Install StudyOS"**
4. The app opens in its own window

---

## Supabase Setup

### 1. Create Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your Project URL and Anon Key

### 2. Run Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Open `supabase/schema.sql` from this project
3. Paste and run the entire SQL

This creates:
- All database tables (tasks, sessions, settings, profiles, groups, messages)
- Row Level Security policies
- Storage buckets (group-images, chat-images, voice-notes, avatars)
- Auto-create triggers for new users

### 3. Enable Google OAuth (Optional)
1. In Supabase → Authentication → Providers → Google
2. Enable and add your Google Cloud credentials
3. Add your deployed URL to Redirect URLs:
   ```
   https://your-project.vercel.app/auth/callback
   https://localhost:3000/auth/callback
   ```

### 4. Enable Realtime
1. In Supabase → Database → Replication
2. Enable replication for these tables:
   - `tasks`
   - `study_sessions`
   - `messages`
   - `group_members`

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Other Hosting Options

### Netlify
```bash
# Build command
npm run build

# Output directory
.next

# Install command
npm install
```

### Docker
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Self-Hosted (PM2)
```bash
npm run build
npm install -g pm2
pm2 start npm --name "studynos" -- start
pm2 save
pm2 startup
```

---

## Performance Checklist

- ✅ Images compressed before upload
- ✅ Service worker for offline caching
- ✅ Real-time updates without page refresh
- ✅ Timer persists across refresh (timestamp-based)
- ✅ Optimistic UI for instant feedback
- ✅ Lazy loading for images
- ✅ Pagination for messages
- ✅ Debounced search
- ✅ Indexed database columns
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ PWA installable on all devices

---

## What Works Offline (with Service Worker)

- App shell loads from cache
- Previously visited pages are cached
- Timer continues running locally

## What Requires Internet

- Supabase API calls (auth, data)
- Realtime subscriptions
- Image/voice note uploads
- Community messages

---

## Troubleshooting

### "Authentication failed" on login
- Make sure you ran the full SQL schema in Supabase
- Check that Google OAuth is enabled in Supabase dashboard
- Verify redirect URLs include your domain

### Realtime not working
- Enable replication for the required tables in Supabase
- Check that your Supabase plan supports realtime

### Timer resets on refresh
- Make sure localStorage is not disabled in your browser
- Timer state is stored locally, not in the database

### Images not uploading
- Check that storage buckets exist in Supabase
- Verify RLS policies allow uploads
- Check file size (max 5MB for chat images, 2MB for avatars)
