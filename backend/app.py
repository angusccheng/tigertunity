import flask
import flask_cors
import os
import psycopg2
import psycopg2.extras
import identity.flask
import flask_sqlalchemy
from flask_session import Session  #

app = flask.Flask(__name__)
flask_cors.CORS(app, supports_credentials=True) # 
_DATABASE_URL = os.getenv('NEON_URL')

'''
methods:
- add_officer: creates an officer in the officer_table
- add_club: creates a club in the club_table
- add_post: 
- index(): main place; get the top 3 entries in the post table

'''

# Database connection
def get_db_connection():
    '''Create and return a database connection'''
    conn = psycopg2.connect(_DATABASE_URL, sslmode="require")
    return conn

@app.route('/logout', methods=['GET'])
def logout():
    response = flask.redirect(flask.url_for('identity.logout'))
    return response

app.config['SCOPE'] = os.environ['SCOPE']
app.config['ENDPOINT'] = os.environ['ENVIRON']
auth = identity.flask.Auth(
    app,
    authority=os.environ['AUTHORITY'],
    client_id=os.environ['CLIENT_ID'],
    client_credential=os.environ['CLIENT_SECRET'],
    redirect_uri=os.environ['REDIRECT_URI'],
    post_logout_view=logout
)

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
