import flask
import flask_cors
import os
import psycopg2

app = flask.Flask(__name__, template_folder='.')
flask_cors.CORS(app)
_DATABASE_URL = os.getenv('EXTERNAL_URL')

'''
methods:
- add_officer: creates an officer in the officer_table
- add_club: creates a club in the club_table
- add_post: 
- index(): main place; get the top 3 entries in the post table

'''

def get_db_connection():
    '''Create and return a database connection'''
    conn = psycopg2.connect(_DATABASE_URL, sslmode="require")
    return conn

@app.route('/new', methods=['POST'])
def create_entry():
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
                command = f"INSERT INTO post_table (post_title, club_name, officer_name, post_content, post_type) VALUE ({post_title}, {club_name}, {officer_name}, {post_content}, {post_type});"
                cur.execute(command)
                
                new_entry = cur.fetchone()
                conn.commit()
        return flask.jsonify({
            'message': 'Entry created successfully',
            'entry': dict(new_entry)
        })
                
    except Exception as e:
        return flask.jsonify({'error': str(e)})

@app.route('/index', methods=['GET'])
@app.route('/', methods=['GET'])
def index():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                command = "SELECT * FROM post_table ORDER BY timestamp DESC LIMIT 5"
                cur.execute(command)
                entries = cur.fetchall()
        return flask.jsonify([dict(entry) for entry in entries])
    except Exception as e:
        return flask.jsonify({'error': str(e)})
