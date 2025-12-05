-- POST TABLE
CREATE TABLE IF NOT EXISTS post_table (
  post_id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_title TEXT NOT NULL,
  club_id INTEGER NOT NULL,
  officer_id INTEGER NOT NULL,
  post_content TEXT NOT NULL,
  post_time TEXT DEFAULT CURRENT_TIMESTAMP,
  post_type TEXT NOT NULL,
  edit_time TIMESTAMP DEFAULT NOW(),
  edit_status BOOL DEFAULT FALSE
)

-- USER TABLE
CREATE TABLE IF NOT EXISTS user_table (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  saved_posts TEXT,   -- store JSON array
  saved_clubs TEXT    -- store JSON array
);

-- OFFICER TABLE
CREATE TABLE IF NOT EXISTS officer_table (
  officer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  officer_name TEXT NOT NULL,
  saved_posts INTEGER[],
  saved_clubs INTEGER[],
  officer_clubs INTEGER[],
  associated_posts INTEGER[]
)

-- CLUB TABLE
CREATE TABLE IF NOT EXISTS club_table (
  club_id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_profile TEXT NOT NULL,
  club_type TEXT NOT NULL,
  club_filters TEXT,       -- JSON array
  club_officers TEXT,      -- JSON array
  president INTEGER,
  vice_president INTEGER,
  treasurer INTEGER
);

-- Table for AI-parsed / Zapier-ingested posts
CREATE TABLE parsed_posts (
    parsed_id SERIAL PRIMARY KEY,
    post_title TEXT NOT NULL,
    club_name TEXT NOT NULL,
    officer_name TEXT NOT NULL DEFAULT 'tigertunity-bot',
    post_content TEXT NOT NULL,
    post_type TEXT NOT NULL,
    post_time TIMESTAMP DEFAULT NOW()
);
-- NONCES TABLE
CREATE TABLE IF NOT EXISTS nonces (
    nonce TEXT PRIMARY KEY,
    username TEXT
);

-- CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    text TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dm_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE club_requests (
  request_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  notes TEXT
);

CREATE TABLE officer_table (
  user_id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  saved_posts INTEGER[],
  saved_clubs INTEGER[],
  officer_clubs INTEGER[],
  associated_posts INTEGER[],
  notepad TEXT NOT NULL,
  admin_status BOOL DEFAULT FALSE,
  display_name TEXT,
  user_preferences TEXT[]
)

-- Migration: Add read tracking columns to conversations table
-- Run this to add unread message tracking to existing databases

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS last_read_user1 INTEGER,
ADD COLUMN IF NOT EXISTS last_read_user2 INTEGER;

