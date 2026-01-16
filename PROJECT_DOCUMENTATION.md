# Portfolio Website with OTP Authentication System
## Complete Project Documentation

**Project Name:** Personal Portfolio Website  
**Developer:** Madhan Sainath Reddy Bommidi  
**Version:** 1.0.0  
**Last Updated:** January 17, 2026  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Frontend Application](#4-frontend-application)
5. [Backend API Server](#5-backend-api-server)
6. [Database Schema](#6-database-schema)
7. [OTP Authentication Flow](#7-otp-authentication-flow)
8. [Deployment Configuration](#8-deployment-configuration)
9. [Environment Variables](#9-environment-variables)
10. [API Endpoints Reference](#10-api-endpoints-reference)
11. [Admin Operations](#11-admin-operations)
12. [Maintenance & Updates](#12-maintenance--updates)
13. [Troubleshooting Guide](#13-troubleshooting-guide)

---

## 1. Project Overview

### 1.1 Description
A modern, responsive personal portfolio website built with Angular, featuring a secure OTP (One-Time Password) authentication system to protect project access. The website showcases professional experience, skills, education, certifications, and featured projects.

### 1.2 Key Features
- **Responsive Design:** Fully responsive layout that works on desktop, tablet, and mobile devices
- **Dark Theme:** Modern dark theme with amber accent colors
- **Smooth Animations:** CSS animations for enhanced user experience
- **OTP Authentication:** Secure access control for project links (Live Site & GitHub)
- **Session Management:** 7-day active sessions with automatic expiry
- **Visitor Tracking:** Database storage of visitor access requests with timestamps
- **Admin Controls:** API endpoints for managing user sessions

### 1.3 Live URLs
| Component | URL |
|-----------|-----|
| Frontend (Portfolio) | https://bmsnr4262.github.io/mb-port/ |
| Backend API | https://mb-port-production.up.railway.app |
| GitHub Repository | https://github.com/bmsnr4262/mb-port |

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 21.x | Frontend framework |
| TypeScript | 5.x | Programming language |
| CSS3 | - | Styling with custom properties |
| HTML5 | - | Markup language |

### 2.2 Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x+ | Runtime environment |
| Express.js | 4.x | Web framework |
| pg (node-postgres) | 8.x | PostgreSQL client |
| cors | 2.x | Cross-Origin Resource Sharing |
| dotenv | 16.x | Environment variables |

### 2.3 Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database for visitor data |

### 2.4 External Services
| Service | Purpose |
|---------|---------|
| Web3Forms | Email delivery for OTP codes |
| GitHub Pages | Frontend hosting |
| Railway | Backend & Database hosting |

---

## 3. System Architecture

### 3.1 Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                            │
│                 GitHub Pages Hosting                             │
│              https://bmsnr4262.github.io/mb-port/                │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Portfolio        │  │ OTP Auth         │  │ Supabase      │  │
│  │ Component        │  │ Component        │  │ Service       │  │
│  │ (Main Page)      │  │ (Auth Page)      │  │ (API Client)  │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      WEB3FORMS API       │    │     BACKEND API          │
│   (Email OTP Delivery)   │    │   Railway Hosting        │
│                          │    │   Node.js + Express      │
│  - Sends OTP to owner    │    │                          │
│  - Email: bmsnr4262@     │    │  ┌────────────────────┐  │
│    gmail.com             │    │  │  Express Server    │  │
└──────────────────────────┘    │  │  Port: 8080        │  │
                                │  └────────────────────┘  │
                                │            │             │
                                │            ▼             │
                                │  ┌────────────────────┐  │
                                │  │   PostgreSQL DB    │  │
                                │  │   Railway Hosted   │  │
                                │  └────────────────────┘  │
                                └──────────────────────────┘
```

### 3.2 Data Flow
1. User visits portfolio website
2. User clicks on a project link (Live Site or GitHub)
3. User is redirected to OTP authentication page
4. User enters name and email
5. OTP is generated and sent to owner's email via Web3Forms
6. Visitor data is saved to PostgreSQL database
7. User enters received OTP
8. If valid, session is activated (status_id = 1)
9. Project link opens in new tab
10. User redirected back to portfolio home

---

## 4. Frontend Application

### 4.1 Project Structure
```
src/
├── app/
│   ├── app.ts                    # Root component with RouterOutlet
│   ├── app.html                  # Root template
│   ├── app.css                   # Root styles
│   ├── app.routes.ts             # Route configuration
│   ├── app.config.ts             # Application configuration
│   ├── app.config.server.ts      # Server-side configuration
│   ├── app.routes.server.ts      # Server-side routes
│   │
│   ├── portfolio/
│   │   ├── portfolio.component.ts      # Main portfolio component
│   │   ├── portfolio.component.html    # Portfolio template
│   │   └── portfolio.component.css     # Portfolio styles
│   │
│   ├── otp-auth/
│   │   ├── otp-auth.component.ts       # OTP authentication component
│   │   ├── otp-auth.component.html     # OTP auth template
│   │   └── otp-auth.component.css      # OTP auth styles
│   │
│   └── services/
│       └── supabase.service.ts         # Backend API service
│
├── index.html                    # Main HTML file
├── main.ts                       # Application bootstrap
├── main.server.ts                # Server-side bootstrap
├── server.ts                     # SSR server
└── styles.css                    # Global styles
```

### 4.2 Route Configuration
**File:** `src/app/app.routes.ts`

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | PortfolioComponent | Main portfolio page |
| `/auth` | OtpAuthComponent | OTP authentication page |
| `/**` | Redirect to `/` | Catch-all redirect |

### 4.3 Portfolio Component

**File:** `src/app/portfolio/portfolio.component.ts`

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `profile` | Object | Personal information (name, title, tagline) |
| `experience` | Object | Years of experience and specializations |
| `about` | Object | About section content |
| `education` | Object | Educational qualifications |
| `experiences` | Array | Work experience list |
| `projects` | Array | Featured projects list |
| `certifications` | Array | Professional certifications |
| `skillCategories` | Array | Technical skills grouped by category |
| `socials` | Array | Social media links |
| `isScrolled` | Signal | Header scroll state |
| `mobileMenuOpen` | Signal | Mobile menu toggle state |

#### Key Methods
| Method | Parameters | Description |
|--------|------------|-------------|
| `onScroll()` | - | Updates header style on scroll |
| `toggleMobileMenu()` | - | Toggles mobile navigation menu |
| `closeMobileMenu()` | - | Closes mobile navigation menu |
| `navigateWithAuth()` | project, type, event | Redirects to OTP auth page with project details |
| `handleSubmit()` | event | Handles contact form submission |

### 4.4 OTP Authentication Component

**File:** `src/app/otp-auth/otp-auth.component.ts`

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `redirectUrl` | string | Target URL after authentication |
| `projectName` | string | Name of the project being accessed |
| `projectType` | string | Type: 'live' or 'github' |
| `visitorName` | string | Visitor's entered name |
| `visitorEmail` | string | Visitor's entered email |
| `enteredOtp` | string | OTP entered by visitor |
| `generatedOtp` | string | Randomly generated 6-digit OTP |
| `otpSent` | Signal | OTP sent state |
| `otpVerified` | Signal | OTP verification state |
| `loading` | Signal | Loading state |
| `error` | Signal | Error message |
| `success` | Signal | Success message |
| `countdown` | Signal | Resend countdown timer |

#### Key Methods
| Method | Description |
|--------|-------------|
| `ngOnInit()` | Initializes component, checks for existing session |
| `checkExistingSession()` | Checks if visitor has active session in database |
| `generateOtp()` | Generates random 6-digit OTP |
| `sendOtp()` | Saves request to DB and sends OTP via email |
| `sendEmailWithOtp()` | Sends OTP using Web3Forms API |
| `verifyOtp()` | Validates entered OTP and activates session |
| `redirectToProject()` | Opens project in new tab and returns to home |
| `resendOtp()` | Regenerates and resends OTP |
| `startCountdown()` | Starts 60-second resend cooldown |
| `goBack()` | Returns to portfolio home |

### 4.5 Backend Service (Supabase Service)

**File:** `src/app/services/supabase.service.ts`

#### Configuration
```typescript
private readonly API_URL = 'https://mb-port-production.up.railway.app/api';
```

#### Methods
| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `checkSession()` | visitorEmail, projectName | Promise<SessionCheckResult> | Checks for active session |
| `saveAccessRequest()` | request | Promise<boolean> | Saves visitor access request |
| `markAsVerified()` | visitorEmail, otpCode | Promise<boolean> | Marks request as verified |
| `getAllAccessRequests()` | - | Promise<VisitorAccessRequest[]> | Gets all requests (admin) |
| `getStats()` | - | Promise<any> | Gets statistics (admin) |

#### Helper Methods
| Method | Description |
|--------|-------------|
| `formatLocalTime()` | Formats date to readable local time with timezone |
| `getTimezoneAbbreviation()` | Converts timezone name to abbreviation (e.g., IST) |

### 4.6 Web3Forms Integration

**API Key:** `12694df3-42eb-4a6d-aaa5-1384c8c93dde`  
**Owner Email:** `bmsnr4262@gmail.com`

#### Email Template
```
Subject: [OTP] Portfolio Access Request from {visitorName}

Visitor Details:
- Name: {visitorName}
- Email: {visitorEmail}
- Project: {projectName}

Your OTP: {generatedOtp}

This OTP is valid for 10 minutes.
```

---

## 5. Backend API Server

### 5.1 Project Structure
```
backend/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── package-lock.json      # Dependency lock file
├── Procfile               # Railway start command
├── railway.json           # Railway configuration
├── nixpacks.toml          # Nixpacks configuration
├── database-setup.sql     # Database schema
└── env-example.env.txt    # Environment variables example
```

### 5.2 Server Configuration

**File:** `backend/server.js`

#### Express Setup
```javascript
const app = express();
const PORT = process.env.PORT || 3000;
```

#### Middleware
- **CORS:** Allows requests from frontend domains
- **JSON Parser:** Parses incoming JSON requests

#### Allowed Origins
```javascript
cors({
  origin: [
    'http://localhost:4200',
    'https://bmsnr4262.github.io',
    /\.railway\.app$/,
    /\.up\.railway\.app$/
  ]
})
```

### 5.3 Database Connection

**Connection Pool Configuration:**
```javascript
const pool = process.env.DATABASE_URL 
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'portfolio_db',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });
```

### 5.4 Session Management

**Session Duration:** 7 days

**Auto-Cleanup:** Every hour, expired sessions are automatically deactivated:
```javascript
setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour
```

**Cleanup Logic:**
```sql
UPDATE visitor_access_requests 
SET status_id = 2 
WHERE status_id = 1 AND expires_at < NOW()
```

---

## 6. Database Schema

### 6.1 Table: visitor_access_requests

**SQL Creation Script:**
```sql
CREATE TABLE visitor_access_requests (
    id SERIAL PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_email VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(50) DEFAULT 'live',
    redirect_url TEXT,
    otp_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    status_id INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    local_time VARCHAR(50),
    client_timezone VARCHAR(100),
    verified_at TIMESTAMP WITH TIME ZONE,
    last_access_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);
```

### 6.2 Column Definitions

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | SERIAL | Auto-increment | Primary key |
| visitor_name | VARCHAR(255) | Required | Visitor's name |
| visitor_email | VARCHAR(255) | Required | Visitor's email |
| project_name | VARCHAR(255) | Required | Project being accessed |
| project_type | VARCHAR(50) | 'live' | Type: 'live' or 'github' |
| redirect_url | TEXT | NULL | Target URL after auth |
| otp_code | VARCHAR(6) | Required | Generated OTP |
| is_verified | BOOLEAN | FALSE | OTP verification status |
| status_id | INTEGER | 2 | Session status (1=Active, 2=Inactive) |
| created_at | TIMESTAMP | NOW() | Request creation time |
| local_time | VARCHAR(50) | NULL | Human-readable local time (e.g., "2026-01-17 02:12:59 IST") |
| client_timezone | VARCHAR(100) | NULL | Client's timezone (e.g., "Asia/Kolkata") |
| verified_at | TIMESTAMP | NULL | When OTP was verified |
| last_access_at | TIMESTAMP | NULL | Last session access time |
| expires_at | TIMESTAMP | NULL | Session expiration time |

### 6.3 Status ID Values

| status_id | Status | Description |
|-----------|--------|-------------|
| 1 | ACTIVE | User can access without OTP for 7 days |
| 2 | INACTIVE | User must authenticate with OTP |

---

## 7. OTP Authentication Flow

### 7.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘

1. CLICK PROJECT LINK
   │
   ▼
2. REDIRECT TO /auth?redirect=URL&project=NAME&type=TYPE
   │
   ▼
3. CHECK EXISTING SESSION ──────────────────────┐
   │                                            │
   │ No Active Session                          │ Active Session Found
   ▼                                            ▼
4. SHOW NAME/EMAIL FORM                    DIRECT ACCESS
   │                                       (Open in new tab)
   ▼
5. USER ENTERS DETAILS & CLICKS "REQUEST ACCESS"
   │
   ├──► Generate 6-digit OTP
   ├──► Save to Database (status_id = 2)
   └──► Send Email via Web3Forms
   │
   ▼
6. SHOW OTP INPUT FORM
   │
   ▼
7. USER ENTERS OTP & CLICKS "VERIFY"
   │
   ├──► Compare with stored OTP
   │    │
   │    ├─ Invalid ──► Show Error, Allow Retry
   │    │
   │    └─ Valid ──► Update Database:
   │                  - is_verified = TRUE
   │                  - status_id = 1
   │                  - verified_at = NOW()
   │                  - expires_at = NOW() + 7 days
   │
   ▼
8. SUCCESS! 
   │
   ├──► Open project URL in new tab
   └──► Redirect to portfolio home
```

### 7.2 Session Lifecycle

```
Day 0: User authenticates
       └──► status_id = 1 (Active)
       └──► expires_at = NOW() + 7 days

Day 1-6: User visits again
         └──► Session check passes
         └──► Direct access (no OTP needed)
         └──► last_access_at updated

Day 7+: Session expires
        └──► Auto-cleanup sets status_id = 2
        └──► User must re-authenticate with OTP

Manual Revocation:
        └──► Admin sets status_id = 2
        └──► User must re-authenticate with OTP
```

---

## 8. Deployment Configuration

### 8.1 Frontend Deployment (GitHub Pages)

#### Build Command
```bash
ng build --base-href "/mb-port/"
```

#### Deploy Command
```bash
npx angular-cli-ghpages --dir=dist/my-portfolio/browser
```

#### GitHub Pages Settings
- **Repository:** https://github.com/bmsnr4262/mb-port
- **Branch:** gh-pages
- **Folder:** / (root)
- **URL:** https://bmsnr4262.github.io/mb-port/

### 8.2 Backend Deployment (Railway)

#### Configuration Files

**Procfile:**
```
web: node server.js
```

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**nixpacks.toml:**
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "node server.js"
```

#### Railway Settings
- **Root Directory:** backend
- **Build Command:** npm install
- **Start Command:** node server.js
- **Watch Paths:** backend/**

### 8.3 Database Deployment (Railway PostgreSQL)

#### Connection Method
Railway provides `DATABASE_URL` environment variable that includes all connection details.

#### Connection String Format
```
postgresql://username:password@host:port/database
```

---

## 9. Environment Variables

### 9.1 Backend Environment Variables (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `${{Postgres.DATABASE_URL}}` |
| PORT | Server port (auto-set by Railway) | 8080 |
| PGHOST | Database host | centerbeam.proxy.rlwy.net |
| PGPORT | Database port | 50768 |
| PGUSER | Database username | postgres |
| PGPASSWORD | Database password | ******** |
| PGDATABASE | Database name | railway |

### 9.2 Frontend Configuration

| Configuration | Value | Location |
|---------------|-------|----------|
| API_URL | https://mb-port-production.up.railway.app/api | supabase.service.ts |
| Web3Forms API Key | 12694df3-42eb-4a6d-aaa5-1384c8c93dde | otp-auth.component.ts |
| Owner Email | bmsnr4262@gmail.com | otp-auth.component.ts |

---

## 10. API Endpoints Reference

### 10.1 Health Check

**Endpoint:** `GET /`  
**Description:** Basic health check  
**Response:**
```json
{
  "status": "ok",
  "message": "Portfolio Backend API is running on Fly.io"
}
```

### 10.2 API Health Check

**Endpoint:** `GET /api/health`  
**Description:** API health check  
**Response:**
```json
{
  "status": "ok",
  "message": "Portfolio Backend API is running"
}
```

### 10.3 Check Session

**Endpoint:** `POST /api/check-session`  
**Description:** Check if visitor has active session  
**Request Body:**
```json
{
  "visitor_email": "user@example.com",
  "project_name": "Portfolio Website"
}
```
**Response (Active Session):**
```json
{
  "success": true,
  "hasActiveSession": true,
  "message": "Active session found",
  "redirect_url": "https://example.com",
  "visitor_name": "John Doe"
}
```
**Response (No Session):**
```json
{
  "success": true,
  "hasActiveSession": false,
  "message": "No active session - OTP required"
}
```

### 10.4 Save Access Request

**Endpoint:** `POST /api/access-requests`  
**Description:** Save new visitor access request  
**Request Body:**
```json
{
  "visitor_name": "John Doe",
  "visitor_email": "john@example.com",
  "project_name": "Portfolio Website - Live Site",
  "project_type": "live",
  "redirect_url": "https://bmsnr4262.github.io/mb-port/",
  "otp_code": "123456",
  "local_time": "2026-01-17 02:12:59 IST",
  "client_timezone": "Asia/Kolkata"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Access request saved",
  "id": 1
}
```

### 10.5 Verify Access

**Endpoint:** `PATCH /api/access-requests/verify`  
**Description:** Verify OTP and activate session  
**Request Body:**
```json
{
  "visitor_email": "john@example.com",
  "otp_code": "123456"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Access verified - Session active for 7 days",
  "expires_at": "2026-01-24T02:12:59.000Z"
}
```

### 10.6 Get All Access Requests (Admin)

**Endpoint:** `GET /api/access-requests`  
**Description:** Retrieve all access requests (limited to 100)  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "visitor_name": "John Doe",
      "visitor_email": "john@example.com",
      "project_name": "Portfolio Website - Live Site",
      "project_type": "live",
      "status_id": 1,
      "status": "ACTIVE",
      "is_verified": true,
      "created_at": "2026-01-17T02:12:59.000Z",
      "verified_at": "2026-01-17T02:13:30.000Z",
      "last_access_at": "2026-01-17T02:13:30.000Z",
      "expires_at": "2026-01-24T02:13:30.000Z"
    }
  ]
}
```

### 10.7 Get Statistics (Admin)

**Endpoint:** `GET /api/stats`  
**Description:** Get access request statistics  
**Response:**
```json
{
  "success": true,
  "data": {
    "total_requests": 10,
    "verified_requests": 8,
    "active_sessions": 5,
    "inactive_sessions": 5
  }
}
```

### 10.8 Revoke User Access (Admin)

**Endpoint:** `PATCH /api/access-requests/revoke`  
**Description:** Revoke active sessions for a user  
**Request Body:**
```json
{
  "visitor_email": "john@example.com"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Revoked 1 active sessions",
  "count": 1
}
```

### 10.9 Reset All Sessions (Admin)

**Endpoint:** `POST /api/access-requests/reset-all`  
**Description:** Reset all active sessions to inactive  
**Response:**
```json
{
  "success": true,
  "message": "Reset 5 active sessions",
  "count": 5
}
```

---

## 11. Admin Operations

### 11.1 View All Visitors (pgAdmin)

```sql
SELECT 
    id,
    visitor_name,
    visitor_email,
    project_name,
    project_type,
    CASE WHEN status_id = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END as status,
    local_time,
    verified_at,
    expires_at
FROM visitor_access_requests 
ORDER BY created_at DESC;
```

### 11.2 Revoke Specific User Access

```sql
UPDATE visitor_access_requests 
SET status_id = 2 
WHERE visitor_email = 'user@example.com';
```

### 11.3 Reset All Sessions

```sql
UPDATE visitor_access_requests 
SET status_id = 2 
WHERE status_id = 1;
```

### 11.4 View Active Sessions Only

```sql
SELECT * FROM visitor_access_requests 
WHERE status_id = 1 AND expires_at > NOW()
ORDER BY verified_at DESC;
```

### 11.5 View Statistics

```sql
SELECT 
    COUNT(*) as total_requests,
    COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_requests,
    COUNT(CASE WHEN status_id = 1 THEN 1 END) as active_sessions,
    COUNT(CASE WHEN status_id = 2 THEN 1 END) as inactive_sessions
FROM visitor_access_requests;
```

### 11.6 Delete Old Records (Optional)

```sql
DELETE FROM visitor_access_requests 
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 12. Maintenance & Updates

### 12.1 Update Frontend

1. Make changes to code in `src/` folder
2. Build the application:
   ```bash
   ng build --base-href "/mb-port/"
   ```
3. Deploy to GitHub Pages:
   ```bash
   npx angular-cli-ghpages --dir=dist/my-portfolio/browser
   ```
4. Commit and push changes:
   ```bash
   git add -A
   git commit -m "Description of changes"
   git push
   ```

### 12.2 Update Backend

1. Make changes to `backend/server.js`
2. Commit and push changes:
   ```bash
   git add -A
   git commit -m "Backend update description"
   git push
   ```
3. Railway will automatically redeploy

### 12.3 Update Database Schema

1. Connect to Railway PostgreSQL via pgAdmin
2. Run ALTER TABLE commands as needed
3. Update `backend/database-setup.sql` for documentation

### 12.4 Update Profile Information

1. Edit `src/app/portfolio/portfolio.component.ts`
2. Update relevant properties:
   - `profile` - Name, title, tagline
   - `experience` - Years of experience
   - `about` - About section content
   - `education` - Educational details
   - `experiences` - Work experience
   - `projects` - Featured projects
   - `certifications` - Certifications
   - `skillCategories` - Technical skills
   - `socials` - Social media links
3. Build and deploy frontend

---

## 13. Troubleshooting Guide

### 13.1 Common Issues

#### Frontend Not Loading
- **Check:** Browser console for errors
- **Fix:** Clear browser cache, check network tab for failed requests

#### OTP Email Not Received
- **Check:** Spam/Junk folder
- **Check:** Web3Forms API key validity
- **Check:** Email in `otp-auth.component.ts` is correct

#### Database Connection Failed
- **Check:** Railway PostgreSQL service is running
- **Check:** DATABASE_URL variable is set in backend service
- **Check:** Railway logs for connection errors

#### Session Not Working
- **Check:** `status_id` value in database
- **Check:** `expires_at` timestamp is in future
- **Check:** Browser sessionStorage for corrupted data

### 13.2 Railway Logs

To view backend logs:
1. Go to Railway dashboard
2. Click on backend service
3. Click "Deploy Logs" or "HTTP Logs" tab

### 13.3 Local Development

#### Run Frontend Locally
```bash
cd D:\Angular\my-portfolio
ng serve
```
Access at: http://localhost:4200

#### Run Backend Locally
```bash
cd D:\Angular\my-portfolio\backend
node server.js
```
Access at: http://localhost:3000

For local backend, update `supabase.service.ts`:
```typescript
private readonly API_URL = 'http://localhost:3000/api';
```

### 13.4 Reset Everything

If you need to reset the authentication system:

1. Reset all sessions via API:
   ```bash
   curl -X POST https://mb-port-production.up.railway.app/api/access-requests/reset-all
   ```

2. Or directly in database:
   ```sql
   UPDATE visitor_access_requests SET status_id = 2;
   ```

---

## Appendix A: File Locations

| File | Path | Purpose |
|------|------|---------|
| Main Component | `src/app/app.ts` | Root Angular component |
| Portfolio Component | `src/app/portfolio/portfolio.component.ts` | Main portfolio page |
| OTP Auth Component | `src/app/otp-auth/otp-auth.component.ts` | Authentication page |
| Backend Service | `src/app/services/supabase.service.ts` | API client |
| Routes | `src/app/app.routes.ts` | Route definitions |
| Global Styles | `src/styles.css` | Global CSS |
| Backend Server | `backend/server.js` | Express API server |
| DB Schema | `backend/database-setup.sql` | PostgreSQL schema |
| Angular Config | `angular.json` | Angular CLI configuration |
| Package Config | `package.json` | NPM dependencies |

---

## Appendix B: Quick Reference Commands

```bash
# Start frontend development server
ng serve

# Build for production
ng build --base-href "/mb-port/"

# Deploy to GitHub Pages
npx angular-cli-ghpages --dir=dist/my-portfolio/browser

# Start backend locally
cd backend && node server.js

# Commit and push all changes
git add -A && git commit -m "message" && git push

# Full deployment (frontend)
ng build --base-href "/mb-port/" && npx angular-cli-ghpages --dir=dist/my-portfolio/browser && git add -A && git commit -m "Deploy update" && git push
```

---

## Appendix C: Contact & Support

**Developer:** Madhan Sainath Reddy Bommidi  
**Email:** bmsnr4262@gmail.com  
**LinkedIn:** https://www.linkedin.com/in/madhansainathreddy/  
**GitHub:** https://github.com/bmsnr4262  
**Portfolio:** https://bmsnr4262.github.io/mb-port/

---

**Document Version:** 1.0.0  
**Last Updated:** January 17, 2026  
**Generated By:** Claude AI Assistant

---

*End of Documentation*
