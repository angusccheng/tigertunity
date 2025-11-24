-- commands for creating all of the tables
CREATE TABLE post_table (
  post_id SERIAL PRIMARY KEY,
  post_title TEXT NOT NULL,
  club_id INT NOT NULL,
  officer_id INT NOT NULL,
  post_content TEXT NOT NULL,
  post_time TIMESTAMP DEFAULT NOW(),
  post_type TEXT NOT NULL,
  edit_time TIMESTAMP DEFAULT NOW(),
  edit_status BOOL DEFAULT FALSE
  post_filters TEXT[],
  location TEXT,
  link TEXT
)

CREATE TABLE user_table (
  user_id SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  saved_posts INTEGER[],
  saved_clubs INTEGER[]
)

CREATE TABLE officer_table (
  officer_id SERIAL PRIMARY KEY,
  officer_name TEXT NOT NULL,
  saved_posts INTEGER[],
  saved_clubs INTEGER[],
  officer_clubs INTEGER[],
  associated_posts INTEGER[],
  notepad TEXT NOT NULL,
  officer_status BOOL DEFAULT FALSE,
  admin_status BOOL DEFAULT FALSE,
  display_name TEXT,
  officer_preferences TEXT[]
)

CREATE TABLE club_table (
  club_id SERIAL PRIMARY KEY,
  club_profile TEXT NOT NULL,
  club_type TEXT NOT NULL,
  club_filters TEXT[],
  club_officers INTEGER[],
  president INTEGER,
  vice_president INTEGER,
  treasurer INTEGER
)

CREATE TABLE nonces (
    nonce VARCHAR NOT NULL,
    username VARCHAR,
    PRIMARY KEY (nonce)
);

