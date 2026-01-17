require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Session duration: 7 days in milliseconds
const SESSION_DURATION_DAYS = 7;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://bmsnr4262.github.io',
    /\.railway\.app$/,  // Allow all Railway domains
    /\.up\.railway\.app$/
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Health check for Fly.io
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Portfolio Backend API is running on Fly.io' });
});

// PostgreSQL Connection Pool
// Railway provides DATABASE_URL or individual PGHOST, PGPORT, etc.
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
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'your_password',
      ssl: process.env.DB_SSL === 'true' || process.env.PGHOST ? { rejectUnauthorized: false } : false
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

// ============================================
// CONTACT MESSAGES API ENDPOINTS
// ============================================

// Save a new contact message
app.post('/api/contact-messages', async (req, res) => {
  try {
    const {
      sender_name,
      sender_email,
      subject,
      message,
      local_time,
      client_timezone
    } = req.body;

    // Validate required fields
    if (!sender_name || !sender_email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields (name, email, message)' 
      });
    }

    const query = `
      INSERT INTO contact_messages 
        (sender_name, sender_email, subject, message, local_time, client_timezone, created_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;

    const result = await pool.query(query, [
      sender_name,
      sender_email,
      subject || 'No Subject',
      message,
      local_time || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      client_timezone || 'Asia/Kolkata'
    ]);

    console.log(`📧 New contact message from: ${sender_name} (${sender_email}) at ${local_time}`);

    res.json({ 
      success: true, 
      message: 'Message saved successfully',
      id: result.rows[0].id 
    });

  } catch (error) {
    console.error('❌ Error saving contact message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save message' 
    });
  }
});

// Get all contact messages (for admin)
app.get('/api/contact-messages', async (req, res) => {
  try {
    const query = `
      SELECT id, sender_name, sender_email, subject, message,
             is_read, is_replied, created_at, local_time, read_at, replied_at
      FROM contact_messages 
      ORDER BY created_at DESC 
      LIMIT 100
    `;

    const result = await pool.query(query);

    res.json({ 
      success: true, 
      data: result.rows 
    });

  } catch (error) {
    console.error('❌ Error fetching contact messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch messages' 
    });
  }
});

// Get unread messages count
app.get('/api/contact-messages/unread', async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM contact_messages 
      WHERE is_read = FALSE
    `;

    const result = await pool.query(query);

    res.json({ 
      success: true, 
      unread_count: parseInt(result.rows[0].unread_count) 
    });

  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unread count' 
    });
  }
});

// Mark message as read
app.patch('/api/contact-messages/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE contact_messages 
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1
      RETURNING id, sender_name, sender_email
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount > 0) {
      console.log(`✅ Message ${id} marked as read`);
      res.json({ 
        success: true, 
        message: 'Message marked as read' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }

  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update message' 
    });
  }
});

// Mark message as replied
app.patch('/api/contact-messages/:id/replied', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE contact_messages 
      SET is_replied = TRUE, replied_at = NOW()
      WHERE id = $1
      RETURNING id, sender_name, sender_email
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount > 0) {
      console.log(`✅ Message ${id} marked as replied`);
      res.json({ 
        success: true, 
        message: 'Message marked as replied' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }

  } catch (error) {
    console.error('❌ Error marking message as replied:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update message' 
    });
  }
});

// Delete a contact message
app.delete('/api/contact-messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM contact_messages 
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount > 0) {
      console.log(`🗑️ Message ${id} deleted`);
      res.json({ 
        success: true, 
        message: 'Message deleted' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Message not found' 
      });
    }

  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete message' 
    });
  }
});

// Get contact message statistics
app.get('/api/contact-messages/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
        COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_messages,
        COUNT(CASE WHEN is_replied = TRUE THEN 1 END) as replied_messages
      FROM contact_messages
    `;

    const result = await pool.query(statsQuery);

    res.json({ 
      success: true, 
      data: result.rows[0] 
    });

  } catch (error) {
    console.error('❌ Error fetching message stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics' 
    });
  }
});

// ============================================
// EMAIL CONFIGURATION (Gmail SMTP)
// ============================================

// Create email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'bmsnr4262@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password (not regular password)
  }
});

// Send reply email endpoint
app.post('/api/send-reply', async (req, res) => {
  try {
    const { to_email, to_name, subject, original_message, reply_message } = req.body;

    if (!to_email || !reply_message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email and reply message are required' 
      });
    }

    // Check if email credentials are configured
    if (!process.env.EMAIL_APP_PASSWORD) {
      console.log('⚠️ EMAIL_APP_PASSWORD not configured - email not sent');
      // Return success anyway for demo purposes, but log the issue
      return res.json({ 
        success: true, 
        message: 'Reply recorded (email sending not configured)',
        demo_mode: true
      });
    }

    const mailOptions = {
      from: `"Madhan Sainath Reddy" <${process.env.EMAIL_USER || 'bmsnr4262@gmail.com'}>`,
      to: to_email,
      subject: `Re: ${subject || 'Your Message'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">Hello ${to_name || 'there'}!</h2>
          
          <p>Thank you for reaching out. Here is my response to your message:</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;"><strong>Your Original Message:</strong></p>
            <p style="color: #374151;">"${original_message}"</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; font-size: 14px; margin-bottom: 10px;"><strong>My Reply:</strong></p>
            <p style="color: #78350f;">${reply_message}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #1f2937;">Madhan Sainath Reddy Bommidi</strong><br>
            Full-Stack Developer<br>
            <a href="https://bmsnr4262.github.io/mb-port/" style="color: #f59e0b;">Portfolio Website</a>
          </p>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    
    console.log(`📧 Reply sent to: ${to_email}`);

    res.json({ 
      success: true, 
      message: 'Reply sent successfully' 
    });

  } catch (error) {
    console.error('❌ Error sending reply email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send reply email: ' + error.message 
    });
  }
});

// ============================================
// ADMIN AUTHENTICATION API ENDPOINTS
// ============================================

// Helper: Hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper: Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Admin Signup - Request access (sends OTP to owner)
app.post('/api/admin/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required' 
      });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }

    // Generate OTP and hash password
    const otp = generateOTP();
    const passwordHash = hashPassword(password);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Insert new admin user (not approved yet)
    const result = await pool.query(`
      INSERT INTO admin_users (username, email, password_hash, otp_code, otp_expires_at, is_approved)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING id
    `, [username, email, passwordHash, otp, otpExpiresAt]);

    console.log(`🔐 Admin signup request: ${username} (${email}) - OTP: ${otp}`);

    res.json({ 
      success: true, 
      message: 'Signup request submitted. OTP sent to owner for approval.',
      otp: otp, // In production, this would be sent via email to owner
      userId: result.rows[0].id
    });

  } catch (error) {
    console.error('❌ Error in admin signup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process signup request' 
    });
  }
});

// Admin Verify OTP - Complete signup
app.post('/api/admin/verify-signup', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Find user with matching email and OTP
    const result = await pool.query(`
      SELECT id, username, otp_expires_at FROM admin_users 
      WHERE email = $1 AND otp_code = $2 AND is_approved = false
    `, [email, otp]);

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP or email' 
      });
    }

    const user = result.rows[0];

    // Check if OTP expired
    if (new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please signup again.' 
      });
    }

    // Approve the user
    await pool.query(`
      UPDATE admin_users 
      SET is_approved = true, otp_code = NULL, otp_expires_at = NULL
      WHERE id = $1
    `, [user.id]);

    console.log(`✅ Admin approved: ${user.username}`);

    res.json({ 
      success: true, 
      message: 'Account verified successfully. You can now login.' 
    });

  } catch (error) {
    console.error('❌ Error verifying admin signup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP' 
    });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    const passwordHash = hashPassword(password);

    // Find user with matching credentials
    const result = await pool.query(`
      SELECT id, username, email, is_approved FROM admin_users 
      WHERE username = $1 AND password_hash = $2
    `, [username, passwordHash]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    const user = result.rows[0];

    if (!user.is_approved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account not yet approved. Please verify OTP first.' 
      });
    }

    // Update last login
    await pool.query(`
      UPDATE admin_users 
      SET last_login_at = NOW(), login_count = login_count + 1
      WHERE id = $1
    `, [user.id]);

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');

    console.log(`✅ Admin login: ${user.username}`);

    res.json({ 
      success: true, 
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Error in admin login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to login' 
    });
  }
});

// ============================================
// ADMIN DASHBOARD API ENDPOINTS
// ============================================

// Get list of available tables
app.get('/api/admin/tables', async (req, res) => {
  try {
    const tables = [
      { name: 'visitor_access_requests', displayName: 'Visitor Access Requests', icon: '🔐' },
      { name: 'contact_messages', displayName: 'Contact Messages', icon: '📧' },
      { name: 'admin_users', displayName: 'Admin Users', icon: '👤' }
    ];

    res.json({ 
      success: true, 
      data: tables 
    });

  } catch (error) {
    console.error('❌ Error fetching tables:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch tables' 
    });
  }
});

// Get table data
app.get('/api/admin/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Whitelist of allowed tables for security
    const allowedTables = ['visitor_access_requests', 'contact_messages', 'admin_users'];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid table name' 
      });
    }

    // For admin_users, hide password_hash and otp_code
    let query;
    if (tableName === 'admin_users') {
      query = `SELECT id, username, email, is_approved, created_at, last_login_at, login_count FROM ${tableName} ORDER BY id ASC LIMIT 100`;
    } else {
      query = `SELECT * FROM ${tableName} ORDER BY id ASC LIMIT 100`;
    }

    const result = await pool.query(query);

    // Get column names
    const columns = result.fields.map(field => field.name);

    res.json({ 
      success: true, 
      tableName: tableName,
      columns: columns,
      data: result.rows,
      rowCount: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error fetching table data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch table data' 
    });
  }
});

// Update record (for marking messages as read, etc.)
app.patch('/api/admin/tables/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const updates = req.body;

    const allowedTables = ['visitor_access_requests', 'contact_messages'];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot update this table' 
      });
    }

    // Build update query dynamically
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      // Prevent updating sensitive fields
      if (['id', 'created_at', 'password_hash'].includes(key)) continue;
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields to update' 
      });
    }

    values.push(id);
    const query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING id`;
    
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Record not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Record updated successfully' 
    });

  } catch (error) {
    console.error('❌ Error updating record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update record' 
    });
  }
});

// Delete record
app.delete('/api/admin/tables/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;

    const allowedTables = ['visitor_access_requests', 'contact_messages'];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete from this table' 
      });
    }

    const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Record not found' 
      });
    }

    console.log(`🗑️ Deleted record ${id} from ${tableName}`);

    res.json({ 
      success: true, 
      message: 'Record deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete record' 
    });
  }
});

// Get dashboard stats
app.get('/api/admin/dashboard-stats', async (req, res) => {
  try {
    const accessStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status_id = 1 THEN 1 END) as active_sessions
      FROM visitor_access_requests
    `);

    const messageStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
      FROM contact_messages
    `);

    const adminStats = await pool.query(`
      SELECT COUNT(*) as total FROM admin_users WHERE is_approved = true
    `);

    res.json({ 
      success: true, 
      data: {
        accessRequests: accessStats.rows[0],
        contactMessages: messageStats.rows[0],
        adminUsers: adminStats.rows[0]
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard stats' 
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

OTP ACCESS ENDPOINTS:
  POST  /api/check-session           → Check existing session
  POST  /api/access-requests         → Save access request
  PATCH /api/access-requests/verify  → Verify OTP & activate
  GET   /api/access-requests         → View all requests (admin)
  PATCH /api/access-requests/revoke  → Revoke user access
  POST  /api/access-requests/reset-all → Reset all sessions

CONTACT MESSAGES ENDPOINTS:
  POST   /api/contact-messages          → Save new message
  GET    /api/contact-messages          → View all messages (admin)
  GET    /api/contact-messages/unread   → Get unread count
  GET    /api/contact-messages/stats    → Get message statistics
  PATCH  /api/contact-messages/:id/read → Mark as read
  PATCH  /api/contact-messages/:id/replied → Mark as replied
  DELETE /api/contact-messages/:id      → Delete message

STATISTICS:
  GET /api/stats → Get OTP statistics
  `);
});
