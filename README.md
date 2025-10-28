# Catalyst Backend - Hugging Face (FREE)

## Features
- ✅ FREE image generation (Stable Diffusion XL)
- ✅ FREE image evaluation (CLIP)
- ✅ No credit card required
- ✅ Permanent image URLs via Cloudinary (optional)

## Setup

### 1. Get Hugging Face API Key (FREE)
1. Go to: https://huggingface.co/settings/tokens
2. Sign up (free account)
3. Click "New token"
4. Name it: "Catalyst Game"
5. Copy the token (starts with hf_...)

### 2. Get Cloudinary Account (OPTIONAL - for permanent URLs)
1. Go to: https://cloudinary.com/users/register_free
2. Sign up (free account)
3. Go to Dashboard
4. Copy: Cloud Name, API Key, API Secret

### 3. Deploy to Render
1. Go to: https://render.com
2. New Web Service
3. Connect GitHub repo
4. Settings:
   - Build: `npm install`
   - Start: `npm start`
5. Environment Variables:
   - `HUGGINGFACE_API_KEY` = your HF token
   - `CLOUDINARY_CLOUD_NAME` = your cloud name (optional)
   - `CLOUDINARY_API_KEY` = your API key (optional)
   - `CLOUDINARY_API_SECRET` = your API secret (optional)

### 4. Test
Visit: `https://your-backend.onrender.com/health`

Should show:
```json
{
  "status": "ok",
  "hfConfigured": true
}
```

## Cost
- Hugging Face: **FREE** (rate limits apply)
- Cloudinary: **FREE** (25GB bandwidth/month)
- Render: **FREE** (may sleep after 15 min inactivity)

**Total: $0** ✅

## Performance
- Image generation: 10-20 seconds
- Evaluation: 2-5 seconds
- Total per team: ~15-25 seconds

Good for educational games with 4-6 teams!
