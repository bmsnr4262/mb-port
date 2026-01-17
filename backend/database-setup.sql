-- ============================================
-- PORTFOLIO DATABASE SETUP SCRIPT
-- Run this in pgAdmin to create the database
-- ============================================

-- Step 1: Create the database (run this separately if needed)
-- CREATE DATABASE portfolio_db;

-- Step 2: Connect to portfolio_db database, then run the following:

-- Drop existing table if you want to start fresh (CAUTION: This deletes all data!)
-- DROP TABLE IF EXISTS visitor_access_requests;

-- Create table for storing visitor access requests
CREATE TABLE IF NOT EXISTS visitor_access_requests (
    id SERIAL PRIMARY KEY,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_email VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(50) DEFAULT 'live',
    redirect_url TEXT,
    otp_code VARCHAR(6) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    status_id INTEGER DEFAULT 2,  -- 1 = Active (can access), 2 = Inactive (needs OTP)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    local_time VARCHAR(50),  -- Human readable local time (e.g., '2026-01-17 00:36:42 IST')
    client_timezone VARCHAR(100),  -- Client's timezone (e.g., 'Asia/Kolkata')
    verified_at TIMESTAMP WITH TIME ZONE,
    last_access_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE  -- Session expires after 1 week
);

-- If table already exists, add the new columns:
-- ALTER TABLE visitor_access_requests ADD COLUMN IF NOT EXISTS status_id INTEGER DEFAULT 2;
-- ALTER TABLE visitor_access_requests ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE visitor_access_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_visitor_email ON visitor_access_requests(visitor_email);
CREATE INDEX IF NOT EXISTS idx_status_id ON visitor_access_requests(status_id);
CREATE INDEX IF NOT EXISTS idx_project_name ON visitor_access_requests(project_name);
CREATE INDEX IF NOT EXISTS idx_expires_at ON visitor_access_requests(expires_at);

-- Add comments for documentation
COMMENT ON TABLE visitor_access_requests IS 'Stores visitor OTP access requests for portfolio projects';
COMMENT ON COLUMN visitor_access_requests.status_id IS '1 = Active (can access without OTP), 2 = Inactive (needs OTP)';
COMMENT ON COLUMN visitor_access_requests.expires_at IS 'Session expires after this timestamp (1 week from verification)';

-- ============================================
-- STATUS VALUES
-- ============================================
-- status_id = 1 : ACTIVE   - User can access project without OTP
-- status_id = 2 : INACTIVE - User must authenticate with OTP

-- ============================================
-- USEFUL QUERIES FOR ADMIN
-- ============================================

-- View all access requests with status
-- SELECT id, visitor_name, visitor_email, project_name, status_id, 
--        CASE WHEN status_id = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END as status,
--        verified_at, expires_at
-- FROM visitor_access_requests 
-- ORDER BY created_at DESC;

-- View active sessions only
-- SELECT * FROM visitor_access_requests WHERE status_id = 1;

-- Manually revoke access for a user (set to inactive)
-- UPDATE visitor_access_requests SET status_id = 2 WHERE visitor_email = 'user@example.com';

-- Manually grant access for a user (set to active)
-- UPDATE visitor_access_requests SET status_id = 1, expires_at = NOW() + INTERVAL '7 days' 
-- WHERE visitor_email = 'user@example.com';

-- Reset ALL sessions to inactive (weekly cleanup)
-- UPDATE visitor_access_requests SET status_id = 2 WHERE status_id = 1;

-- Reset expired sessions to inactive
-- UPDATE visitor_access_requests SET status_id = 2 
-- WHERE status_id = 1 AND expires_at < NOW();

-- Delete old records (older than 30 days)
-- DELETE FROM visitor_access_requests WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- AUTOMATIC WEEKLY RESET (Optional - PostgreSQL Job)
-- ============================================
-- If you want automatic weekly reset, you can set up a cron job or 
-- use pg_cron extension. Otherwise, run the reset query manually.

-- ============================================
-- TABLE 2: CONTACT MESSAGES
-- ============================================

-- Create table for storing contact form messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_replied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    local_time VARCHAR(50),  -- Human readable local time (e.g., '2026-01-17 02:30:45 IST')
    client_timezone VARCHAR(100),  -- Client's timezone
    read_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON contact_messages(is_read);

-- Add comments for documentation
COMMENT ON TABLE contact_messages IS 'Stores contact form submissions from portfolio visitors';
COMMENT ON COLUMN contact_messages.is_read IS 'TRUE if the message has been read by admin';
COMMENT ON COLUMN contact_messages.is_replied IS 'TRUE if a reply has been sent';

-- ============================================
-- USEFUL QUERIES FOR CONTACT MESSAGES
-- ============================================

-- View all unread messages
-- SELECT * FROM contact_messages WHERE is_read = FALSE ORDER BY created_at DESC;

-- Mark a message as read
-- UPDATE contact_messages SET is_read = TRUE, read_at = NOW() WHERE id = 1;

-- Mark a message as replied
-- UPDATE contact_messages SET is_replied = TRUE, replied_at = NOW() WHERE id = 1;

-- View messages from a specific sender
-- SELECT * FROM contact_messages WHERE sender_email = 'user@example.com';

-- Delete old messages (older than 90 days)
-- DELETE FROM contact_messages WHERE created_at < NOW() - INTERVAL '90 days';

-- Get message statistics
-- SELECT 
--     COUNT(*) as total_messages,
--     COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_messages,
--     COUNT(CASE WHEN is_replied = TRUE THEN 1 END) as replied_messages
-- FROM contact_messages;

-- ============================================
-- SUCCESS!
-- ============================================
