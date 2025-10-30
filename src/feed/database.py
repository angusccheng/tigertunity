import dotenv
import os
import psycopg2
import flask

dotenv.load_dotenv()

_DATABASE_URL = os.getenv('EXTERNAL_URL')

def main():
    with psycopg2.connect(_DATABASE_URL, sslmode="require") as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users;")
            
            # create the tables
            create_post_table = '''CREATE TABLE IF NOT EXISTS post_table (
                post_id SERIAL PRIMARY KEY,
                post_title TEXT,
                club_id INT,
                officer_id INT,
                post_content TEXT,
                post_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                post_type TEXT
            );
            '''
            cur.execute(create_post_table)
            
            create_club_table = '''CREATE TABLE IF NOT EXISTS
            club_table (
                club_id SERIAL PRIMARY KEY,
                club_name TEXT
            );
            '''
            cur.execute(create_club_table)
            
            create_officer_table = '''CREATE TABLE IF NOT EXISTS
            officer_table (
                officer_id SERIAL PRIMARY KEY,
                officer_name TEXT
            )
            '''
            
            create_new_post = '''INSERT INTO post_table (post_title, club_id, officer_id, post_content, post_type) VALUES ("New thing happening", 1, 1, "This is the content", "event")
            '''
            rows = cur.fetchall()
            for row in rows:
                print(row)

if __name__ == '__main__':
    main()
