import flask
import flask_cors
import os
import psycopg2
import psycopg2.extras
import identity.flask
import flask_sqlalchemy
from flask_session import Session
import datetime
import json
import dotenv
import flask_jwt_extended
import re

app = flask.Flask(__name__)
dotenv.load_dotenv('../.env')
FRONTEND_URL = os.environ['FRONTEND_URL']
APP_SECRET_KEY = os.environ['APP_SECRET_KEY']

_CAS_URL = 'https://fed.princeton.edu/cas/'
_DATABASE_URL = os.getenv('NEON_URL')

# CORS configuration for API endpoints
flask_cors.CORS(app, resources={r'/api/*': {'origins': FRONTEND_URL}})

# Session Configuration
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = APP_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days=1)
jwtManager = flask_jwt_extended.JWTManager(app)


# Database connection
def get_db_connection():
    '''Create and return a database connection'''
    conn = psycopg2.connect(_DATABASE_URL, sslmode="require")
    return conn


# Displaying posts API
@app.route("/api/posts", methods=["GET"])
def list_posts():
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                command = "SELECT * FROM post_table ORDER BY timestamp DESC LIMIT 5"
                cur.execute(command)
                entries = cur.fetchall()
                print(entries)
        return flask.jsonify(entries)
    except Exception as e:
        return flask.jsonify({'error': str(e)})

# Entry creation API
@app.route('/api/posts', methods=['POST'])
def create_post():
    '''Create a new entry in the database'''
    try:
        data = flask.request.get_json()
        post_title = data.get('post_title')
        club_name = data.get('club_name')
        officer_name = data.get('officer_name')
        post_content = data.get('post_content')
        post_type = data.get('post_type')
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                command = "INSERT INTO post_table (post_title, club_name, officer_name, post_content, post_type) VALUES (%s, %s, %s, %s, %s) RETURNING *;"
                cur.execute(command, (post_title, club_name, officer_name, post_content, post_type))
                
                new_entry = cur.fetchone()
                print(new_entry)
                conn.commit()
        
        keys = ['post_id', 'post_title', 'club_name', 'officer_name', 'post_content', 'timestamp', 'post_type']
        return flask.jsonify({
            'message': 'Entry created successfully',
            'entry': dict(zip(keys, new_entry))
        })
                
    except Exception as e:
        return flask.jsonify({'error': str(e)})

# Delete post API
@app.route('/api/posts/<int:post_id>', methods=["DELETE"])
def delete_post(post_id):
    print("Post_id name:", post_id)
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                command = "DELETE FROM post_table WHERE post_id = %s"
                cur.execute(command, (post_id,))
                conn.commit()
        return flask.jsonify({"message": "Post deleted successfully!"})
    except Exception as e:
        return flask.jsonify({'error': str(e)})
