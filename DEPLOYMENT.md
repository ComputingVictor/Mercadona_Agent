# Deployment Guide - Enhanced Product Details

## Changes Summary

### New Features
1. **Enhanced Product Information**
   - Pack details: `total_units`, `unit_name`, `pack_size`
   - Tax information: `tax_percentage`
   - Displayed as: "Pack de 12 mini botellas • 1.2 kg • 2.167€/kg • IVA: 4%"

2. **Improved Image Quality**
   - Upgraded from 300x300 to 600x600 pixels
   - Better product visualization

### Database Changes
- Added columns to `products` table:
  - `total_units` (INTEGER)
  - `unit_name` (VARCHAR(50))

## Deployment Steps for Railway

### Option 1: Using HTTP Endpoint (Recommended)

Once Railway finishes redeploying (takes ~5-10 minutes after push):

```bash
# 1. Wait for deployment to finish, then run migration
curl -X POST https://web-production-babbe.up.railway.app/api/migrate/add-product-fields

# 2. Trigger a full update to populate new fields
curl -X POST https://web-production-babbe.up.railway.app/api/update

# 3. Verify the changes
curl https://web-production-babbe.up.railway.app/api/stats | python3 -m json.tool
```

### Option 2: Using Railway CLI

```bash
# 1. Install Railway CLI (if not installed)
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link to your project
railway link

# 4. Run migration
railway run python migrate_database.py

# 5. Trigger update
curl -X POST https://web-production-babbe.up.railway.app/api/update
```

### Option 3: Railway Dashboard

1. Go to Railway Dashboard → Your Project
2. Click on "Deployments" tab
3. Wait for latest deployment to finish
4. Click "View Logs" to monitor
5. Once deployed, use curl commands from Option 1

## Verification

Check that everything is working:

```bash
# 1. Check API version (should be 2.3.0)
curl https://web-production-babbe.up.railway.app/

# 2. Check a product has the new fields
curl https://web-production-babbe.up.railway.app/api/products/1234 | python3 -m json.tool

# Expected response should include:
# "total_units": 12,
# "unit_name": "mini botellas",
# "pack_size": 0.1,
# "tax_percentage": 4.0

# 3. Check frontend
# Open: https://computingvictor.github.io/Mercadona_Agent/
# Product images should be sharper (600x600)
# Product details should show pack information
```

## Rollback (if needed)

If something goes wrong:

```bash
# Rollback to previous commit
git revert HEAD~3..HEAD
git push origin main

# Railway will automatically redeploy the previous version
```

## Timeline

- **Code pushed**: Already done ✅
- **Railway detects changes**: Automatic
- **Railway builds**: ~2-3 minutes
- **Railway deploys**: ~1-2 minutes
- **Total wait time**: ~5-10 minutes
- **Run migration**: 1 command
- **Update products**: ~10-15 minutes (background task)

## What Changed

### Backend Files
- `src/models.py` - Added total_units, unit_name columns
- `src/database.py` - Extract new fields from API
- `src/api.py` - Return new fields in endpoints + migration endpoint
- `migrate_database.py` - New migration script

### Frontend Files
- `api-adapter.js` - Improved image quality + detailed product info

## Notes

- Migration endpoint is **idempotent** (safe to call multiple times)
- Images will load faster initially (300x300) then upgrade to 600x600
- Product info only shows if data is available
- All existing data is preserved
