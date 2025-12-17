# Live Voting System

A real-time voting application with admin and user interfaces. Perfect for live presentations, Q&A sessions, and interactive polls.

## Features

- **Admin Interface**: Create questions with multiple answer options, control which question is active, and view live vote counts
- **User Interface**: Vote on active questions in real-time
- **Real-time Synchronization**: Users automatically see new questions as the admin advances through them
- **Active User Tracking**: Admin can see how many users are currently on the voting page
- **Live Vote Updates**: Vote counts update in real-time as users submit their votes

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the application:
   - User interface: http://localhost:3000/
   - Admin interface: http://localhost:3000/admin

## IIS Deployment

**IMPORTANT**: You **DO need Node.js and npm** installed on your Windows Server 2019.

This application is configured to run on IIS using iisnode. See `IIS_DEPLOYMENT.md` for detailed step-by-step instructions.

### Quick Prerequisites Checklist

1. ✅ **Node.js** (includes npm) - Download from https://nodejs.org/
2. ✅ **iisnode** - Download from https://github.com/Azure/iisnode/releases
3. ✅ **URL Rewrite Module** - Download from https://www.iis.net/downloads/microsoft/url-rewrite
4. ✅ **WebSocket Protocol** - Enable in IIS Features (required for Socket.io)

### Quick Deployment Steps

1. Copy all files to your IIS website directory
2. Open PowerShell/CMD in that directory
3. Run: `npm install --production`
4. Configure Application Pool to use "No Managed Code"
5. Ensure `web.config` is in the root directory
6. Set proper file permissions for IIS_IUSRS
7. Access your website URL

**For detailed instructions, see `IIS_DEPLOYMENT.md`**

## Usage

### Admin Interface

1. Navigate to `/admin`
2. Create questions by entering a question and multiple answer options
3. Use the Previous/Next buttons to control which question is currently active
4. View live vote counts and active user count
5. Delete questions as needed

### User Interface

1. Navigate to the main page (`/`)
2. Wait for a question to appear
3. Click on your answer choice
4. Wait for the admin to advance to the next question
5. The screen will automatically update when a new question becomes active

## Technology Stack

- **Backend**: Node.js with Express
- **Real-time**: Socket.io for WebSocket communication
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Storage**: In-memory (can be upgraded to a database for persistence)

## Notes

- Data is stored in memory and will be lost on server restart
- For production use with persistence, consider adding a database (MongoDB, PostgreSQL, etc.)
- The application supports unlimited concurrent users (limited by server resources)

