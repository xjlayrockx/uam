# Isolation & Safety Notes

## Why This Won't Affect Your Other Websites

This voting application is designed to run in **complete isolation** from your existing websites:

### 1. Separate Application Pool
- Creates its own dedicated Application Pool
- Uses "No Managed Code" (doesn't interfere with .NET apps)
- Independent process isolation
- Your other sites keep their own pools

### 2. Separate Directory
- All files in its own folder
- Own `node_modules` (doesn't conflict with other Node.js apps)
- Own `web.config` (scoped only to this app)
- No shared files or dependencies

### 3. Separate URL/Port
- Can run on its own port (e.g., 8080)
- OR as a subdirectory (e.g., `/voting`)
- OR on its own hostname (e.g., `voting.yourdomain.com`)
- Your other sites keep their original URLs

### 4. No Global Changes
- iisnode is installed globally but doesn't change existing site configs
- URL Rewrite rules are per-application (in `web.config`)
- WebSocket Protocol is a server feature (doesn't affect existing sites)
- Node.js installation is global but each app uses its own dependencies

## What Gets Installed Globally (Safe)

These are **server-level** installations that don't affect individual websites:

1. **Node.js** - Runtime (like having .NET Framework - doesn't affect existing sites)
2. **iisnode** - IIS module (like URL Rewrite - enables Node.js support, doesn't change existing configs)
3. **URL Rewrite Module** - IIS module (you may already have this)
4. **WebSocket Protocol** - IIS feature (enables WebSocket support, doesn't change existing sites)

## Deployment Options (Choose One)

### Option 1: New Site on Different Port (Most Isolated)
- URL: `http://yourserver:8080/`
- Completely separate from other sites
- Best for maximum isolation

### Option 2: New Site on Different Hostname
- URL: `http://voting.yourdomain.com/`
- Requires DNS configuration
- Best for production with domain

### Option 3: Application Under Existing Site
- URL: `http://yourserver/voting/`
- Runs as subdirectory
- Still isolated (own app pool, own directory)
- Good if you want it under same domain

## Verification Steps

After deployment, verify isolation:

1. ✅ Check that your other websites still work
2. ✅ Check that they're using different application pools
3. ✅ Check that voting app has its own `node_modules` folder
4. ✅ Check that voting app's `web.config` is only in its directory
5. ✅ Test voting app at its URL
6. ✅ Test other sites at their URLs

## Rollback (If Needed)

If you need to remove this application:

1. Stop the IIS site/application
2. Delete the application directory
3. Delete the application pool (optional)
4. Your other websites continue working normally

**No changes are made to your existing website configurations.**

