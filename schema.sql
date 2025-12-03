-- POST TABLE
CREATE TABLE IF NOT EXISTS post_table (
  post_id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_title TEXT NOT NULL,
  club_id INTEGER NOT NULL,
  officer_id INTEGER NOT NULL,
  post_content TEXT NOT NULL,
  post_time TEXT DEFAULT CURRENT_TIMESTAMP,
  post_type TEXT NOT NULL,
  edit_time TEXT DEFAULT CURRENT_TIMESTAMP,
  edit_status INTEGER DEFAULT 0
);

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
  saved_posts TEXT,        -- JSON array
  saved_clubs TEXT,        -- JSON array
  officer_clubs TEXT,      -- JSON array
  associated_posts TEXT    -- JSON array
);

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
