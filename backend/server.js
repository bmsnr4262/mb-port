require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Session duration: 7 days in milliseconds
const SESSION_DURATION_DAYS = 7;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://bmsnr4262.github.io',
    /\.fly\.dev$/  // Allow all Fly.io domains
  ],
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Health check for Fly.io
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Portfolio Backend API is running on Fly.io' });
});

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'portfolio_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
    // Run expired session cleanup on startup
    cleanupExpiredSessions();
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Cleanup expired sessions (set status_id to 2)
async function cleanupExpiredSessions() {
  try {
    const result = await pool.query(`
      UPDATE visitor_access_requests 
      SET status_id = 2 
      WHERE status_id = 1 AND expires_at < NOW()
      RETURNING visitor_email
    `);
    
    if (result.rowCount > 0) {
      console.log(`🔄 Cleaned up ${result.rowCount} expired sessions`);
    }
  } catch (error) {
    console.error('Error cleaning up sessions:', error.message);
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Portfolio Backend API is running' });
});

// Check if user has active session (no OTP needed)
app.post('/api/check-session', async (req, res) => {
  try {
    const { visitor_email, project_name } = req.body;

    if (!visitor_email) {
      return res.json({ 
        success: true, 
        hasActiveSession: false,
        message: 'No email provided'
      });
    }

    // Check for active session (status_id = 1 and not expired)
    const query = `
      SELECT id, visitor_name, project_name, status_id, expires_at, redirect_url
      FROM visitor_access_requests 
      WHERE visitor_email = $1 
        AND project_name LIKE $2
        AND status_id = 1 
        AND is_verified = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY verified_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [visitor_email, `%${project_name}%`]);

    if (result.rows.length > 0) {
      const session = result.rows[0];
      
      // Update last access time
      await pool.query(
        'UPDATE visitor_access_requests SET last_access_at = NOW() WHERE id = $1',
        [session.id]
      );

      console.log(`✅ Active session found for: ${visitor_email}`);
      
      res.json({ 
        success: true, 
        hasActiveSession: true,
        message: 'Active session found',
        redirect_url: session.redirect_url,
        visitor_name: session.visitor_name
      });
    } else {
      res.json({ 
        success: true, 
        hasActiveSession: false,
        message: 'No active session - OTP required'
      });
    }

  } catch (error) {
    console.error('❌ Error checking session:', error);
    res.json({ 
      success: true, 
      hasActiveSession: false,
      message: 'Session check failed'
    });
  }
});

// Save visitor access request
app.post('/api/access-requests', async (req, res) => {
  try {
    const {
      visitor_name,
      visitor_email,
      project_name,
      project_type,
      redirect_url,
      otp_code,
      local_time,        // Human readable local time (e.g., '2026-01-17 00:36:42 IST')
      client_timezone    // Client's timezone
    } = req.body;

    // Validate required fields
    if (!visitor_name || !visitor_email || !project_name || !otp_code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const query = `
      INSERT INTO visitor_access_requests 
        (visitor_name, visitor_email, project_name, project_type, redirect_url, otp_code, is_verified, status_id, created_at, local_time, client_timezone)
      VALUES 
        ($1, $2, $3, $4, $5, $6, false, 2, NOW(), $7, $8)
      RETURNING id
    `;

    const result = await pool.query(query, [
      visitor_name,
      visitor_email,
      project_name,
      project_type || 'live',
      redirect_url || '',
      otp_code,
      local_time || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      client_timezone || 'Asia/Kolkata'
    ]);

    console.log(`📝 New access request from: ${visitor_name} (${visitor_email}) at ${local_time}`);

    res.json({ 
      success: true, 
      message: 'Access request saved',
      id: result.rows[0].id 
    });

  } catch (error) {
    console.error('❌ Error saving access request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save access request' 
    });
  }
});

// Mark access request as verified and set active session
app.patch('/api/access-requests/verify', async (req, res) => {
  try {
    const { visitor_email, otp_code } = req.body;

    if (!visitor_email || !otp_code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing email or OTP' 
      });
    }

    // Calculate expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const query = `
      UPDATE visitor_access_requests 
      SET is_verified = true, 
          status_id = 1,
          verified_at = NOW(),
          last_access_at = NOW(),
          expires_at = $3
      WHERE visitor_email = $1 AND otp_code = $2 AND is_verified = false
      RETURNING id, visitor_name, project_name
    `;

    const result = await pool.query(query, [visitor_email, otp_code, expiresAt]);

    if (result.rowCount > 0) {
      const record = result.rows[0];
      console.log(`✅ Access verified for: ${visitor_email} | Session expires: ${expiresAt.toISOString()}`);
      res.json({ 
        success: true, 
        message: 'Access verified - Session active for 7 days',
        expires_at: expiresAt.toISOString()
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'No matching request found' 
      });
    }

  } catch (error) {
    console.error('❌ Error verifying access:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify access' 
    });
  }
});

// Revoke access for a user (set status_id to 2)
app.patch('/api/access-requests/revoke', async (req, res) => {
  try {
    const { visitor_email } = req.body;

    if (!visitor_email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing email' 
      });
    }

    const query = `
      UPDATE visitor_access_requests 
      SET status_id = 2
      WHERE visitor_email = $1 AND status_id = 1
      RETURNING id
    `;

    const result = await pool.query(query, [visitor_email]);

    console.log(`🚫 Access revoked for: ${visitor_email} (${result.rowCount} sessions)`);
    
    res.json({ 
      success: true, 
      message: `Revoked ${result.rowCount} active sessions`,
      count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error revoking access:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to revoke access' 
    });
  }
});

// Reset all sessions (weekly cleanup - can be called manually or via cron)
app.post('/api/access-requests/reset-all', async (req, res) => {
  try {
    const query = `
      UPDATE visitor_access_requests 
      SET status_id = 2
      WHERE status_id = 1
      RETURNING visitor_email
    `;

    const result = await pool.query(query);

    console.log(`🔄 Reset all sessions: ${result.rowCount} users affected`);
    
    res.json({ 
      success: true, 
      message: `Reset ${result.rowCount} active sessions`,
      count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error resetting sessions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset sessions' 
    });
  }
});

// Get all access requests (for admin dashboard)
app.get('/api/access-requests', async (req, res) => {
  try {
    const query = `
      SELECT id, visitor_name, visitor_email, project_name, project_type,
             status_id, 
             CASE WHEN status_id = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END as status,
             is_verified, created_at, verified_at, last_access_at, expires_at
      FROM visitor_access_requests 
      ORDER BY created_at DESC 
      LIMIT 100
    `;

    const result = await pool.query(query);

    res.json({ 
      success: true, 
      data: result.rows 
    });

  } catch (error) {
    console.error('❌ Error fetching access requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch access requests' 
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_requests,
        COUNT(CASE WHEN status_id = 1 THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status_id = 2 THEN 1 END) as inactive_sessions
      FROM visitor_access_requests
    `;

    const result = await pool.query(statsQuery);

    res.json({ 
      success: true, 
      data: result.rows[0] 
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        Portfolio Backend API Server                    ║
╠════════════════════════════════════════════════════════╣
║  🚀 Server: http://localhost:${PORT}                      ║
║  📦 Database: PostgreSQL                               ║
║  🔐 Session Duration: ${SESSION_DURATION_DAYS} days                          ║
║  ⏰ Auto-cleanup: Every hour                           ║
╚════════════════════════════════════════════════════════╝

STATUS CODES:
  status_id = 1 → ACTIVE (can access without OTP)
  status_id = 2 → INACTIVE (needs OTP)

ADMIN ENDPOINTS:
  GET  /api/access-requests     → View all requests
  GET  /api/stats               → Get statistics
  POST /api/access-requests/reset-all → Reset all sessions
  PATCH /api/access-requests/revoke   → Revoke user access
  `);
});
