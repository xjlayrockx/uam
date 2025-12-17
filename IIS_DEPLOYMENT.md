# IIS Deployment Guide for Windows Server 2019

## Prerequisites

Yes, you **DO need Node.js and npm** installed on your Windows Server 2019. Here's what you need:

### 1. Install Node.js
- Download and install Node.js LTS version from: https://nodejs.org/
- This will automatically install npm as well
- **Important**: Install the Windows x64 version
- After installation, verify by opening PowerShell/Command Prompt and running:
  ```
  node --version
  npm --version
  ```

### 2. Install iisnode
- Download iisnode from: https://github.com/Azure/iisnode/releases
- Download the **x64** version (e.g., `iisnode-full-v0.2.26-x64.msi`)
- Run the installer
- This integrates Node.js with IIS

### 3. Install URL Rewrite Module
- Download from: https://www.iis.net/downloads/microsoft/url-rewrite
- Install the URL Rewrite 2.1 module
- This is required for the routing rules in `web.config`

### 4. Enable WebSocket Protocol (for Socket.io)
- Open **Server Manager** → **Add Roles and Features**
- Navigate to: **Web Server (IIS)** → **Web Server** → **Application Development**
- Check **WebSocket Protocol**
- Click **Install**

## Deployment Steps

### Step 1: Create Isolated Application Directory
**IMPORTANT**: To avoid affecting other websites, create a separate directory for this application.

1. Create a new folder for the voting application, for example:
   - `C:\inetpub\wwwroot\voting` (as a subdirectory)
   - OR `C:\Websites\voting` (completely separate location)
   - OR any other location you prefer

2. Copy all project files to this directory:
   - `server.js`
   - `package.json`
   - `web.config`
   - `public/` folder (with all HTML, CSS, JS files)
   - `.gitignore` (optional)

**This application will be completely isolated and won't affect your other websites.**

### Step 2: Create New IIS Application (Recommended for Isolation)

**Option A: Create as a New IIS Site (Best Isolation)**
1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
3. Configure:
   - **Site name**: `VotingApp` (or any name you prefer)
   - **Application pool**: Create new (see Step 3)
   - **Physical path**: Point to your voting application directory (e.g., `C:\inetpub\wwwroot\voting`)
   - **Binding**: 
     - Type: `http` or `https`
     - IP address: `All Unassigned` or specific IP
     - Port: Choose an unused port (e.g., `8080`, `3001`, etc.)
     - Host name: Leave blank OR set a specific hostname (e.g., `voting.yourdomain.com`)
4. Click **OK**

**Option B: Create as Application Under Existing Site (Subdirectory)**
1. Open **IIS Manager**
2. Right-click your existing website → **Add Application**
3. Configure:
   - **Alias**: `voting` (this will be the URL path, e.g., `yoursite.com/voting`)
   - **Application pool**: Create new (see Step 3)
   - **Physical path**: Point to your voting application directory
4. Click **OK**

**Option A is recommended for maximum isolation.**

### Step 3: Create Dedicated Application Pool
1. In IIS Manager, right-click **Application Pools** → **Add Application Pool**
2. Configure:
   - **Name**: `VotingAppPool` (or any name)
   - **.NET CLR version**: **No Managed Code** (important!)
   - **Managed pipeline mode**: **Integrated**
3. Click **OK**
4. Right-click the new pool → **Advanced Settings**:
   - **Start Mode**: `AlwaysRunning` (optional, keeps app ready)
   - **Idle Timeout**: `0` (prevents app from stopping)
5. Assign this pool to your voting application/site

### Step 4: Install Dependencies
1. Open **PowerShell** or **Command Prompt** as Administrator
2. Navigate to your website directory:
   ```
   cd C:\inetpub\wwwroot\voting
   ```
   (Replace with your actual path)
3. Run npm install:
   ```
   npm install --production
   ```
   This will create a `node_modules` folder with all required dependencies.

### Step 5: Verify Isolation Settings
1. Ensure your voting application uses its **own Application Pool** (created in Step 3)
2. Verify the **Physical Path** points only to your voting application directory
3. Check that **Handler Mappings** shows the iisnode handler (should be automatic)
4. Verify **URL Rewrite** rules are present (check in Features View)

**Your other websites will continue using their own application pools and won't be affected.**

### Step 6: Set Permissions
1. Right-click your website folder → **Properties** → **Security** tab
2. Add **IIS_IUSRS** with **Read & Execute** permissions
3. Add **IIS AppPool\YourAppPoolName** with **Read & Execute** permissions
4. Ensure the `iisnode` folder (for logs) has write permissions for IIS_IUSRS

### Step 7: Test the Application

**If you created a new site (Option A):**
- User interface: `http://yourserver:PORT/` (e.g., `http://yourserver:8080/`)
- Admin interface: `http://yourserver:PORT/admin` (e.g., `http://yourserver:8080/admin`)
- OR if you set a hostname: `http://voting.yourdomain.com/`

**If you created an application (Option B):**
- User interface: `http://yourserver/voting/`
- Admin interface: `http://yourserver/voting/admin`

**Your other websites will continue working normally at their original URLs.**

## Troubleshooting

### 500 Internal Server Error
1. **Check iisnode logs**: Look in `iisnode` folder in your website directory
2. **Check Windows Event Viewer**: Look for errors in Application logs
3. **Verify Node.js is installed**: Run `node --version` in PowerShell
4. **Verify dependencies**: Ensure `node_modules` folder exists and has content
5. **Check file permissions**: Ensure IIS has read access to all files

### Socket.io Not Working
1. Ensure **WebSocket Protocol** is enabled (see Prerequisites #4)
2. Check that the Socket.io rule is in `web.config`
3. Verify firewall allows WebSocket connections
4. Check browser console for connection errors

### Port Conflicts
- The application uses the port configured in IIS (usually 80 or 443)
- You can set a custom port via environment variable in `web.config` or IIS Application Settings

### Viewing Logs
- iisnode logs are in: `your-website-directory\iisnode\`
- Check `stderr` and `stdout` files for errors
- Windows Event Viewer → Windows Logs → Application (for IIS errors)

## Environment Variables (Optional)

You can set environment variables in IIS:
1. IIS Manager → Your Website → **Configuration Editor**
2. Navigate to `system.webServer/iisnode`
3. Set `node_env` to `production`

Or add to `web.config`:
```xml
<environmentVariables>
  <add name="PORT" value="80" />
  <add name="NODE_ENV" value="production" />
</environmentVariables>
```

## Security Considerations

1. **Firewall**: Ensure ports 80/443 are open
2. **HTTPS**: Consider setting up SSL certificate for production
3. **Permissions**: Use least privilege principle for IIS App Pool identity
4. **Updates**: Keep Node.js and dependencies updated

## Isolation & Safety

✅ **This application is completely isolated:**
- Uses its own Application Pool (won't affect other sites' pools)
- Has its own directory (won't interfere with other files)
- Has its own `web.config` (scoped to this application only)
- Can run on a separate port or subdirectory
- Node.js dependencies are in its own `node_modules` folder

✅ **Your other websites remain unaffected:**
- They continue using their own application pools
- They continue using their own configurations
- They continue running on their original ports/URLs
- No shared resources or conflicts

## Quick Checklist

- [ ] Node.js installed and verified
- [ ] npm installed and verified
- [ ] iisnode installed
- [ ] URL Rewrite module installed
- [ ] WebSocket Protocol enabled
- [ ] **Separate directory created for voting app**
- [ ] **New Application Pool created (No Managed Code)**
- [ ] **New IIS Site or Application created**
- [ ] Files copied to isolated directory
- [ ] `npm install --production` run successfully
- [ ] File permissions set correctly
- [ ] **Other websites still working**
- [ ] Voting app accessible at its URL

## Support

If you encounter issues:
1. Check iisnode logs first
2. Check Windows Event Viewer
3. Verify all prerequisites are installed
4. Test with a simple Node.js app first to verify iisnode is working

