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
import database_auth as database

app = flask.Flask(__name__)
dotenv.load_dotenv()
FRONTEND_URL = os.environ['FRONTEND_URL']
APP_SECRET_KEY = os.environ['APP_SECRET_KEY']

# CORS configuration for API endpoints
flask_cors.CORS(app, resources={r'/api/*': {'origins': FRONTEND_URL}})

# Session Configuration
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = os.getenv('SESSION_FILE_DIR', '/tmp/flask_session')
Session(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = APP_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days=1)
jwtManager = flask_jwt_extended.JWTManager(app)

# Entra ID Configuration
app.config['SCOPE'] = os.environ['SCOPE']
app.config['ENDPOINT'] = os.environ['ENDPOINT']

# Initialize Entra Auth
auth = identity.flask.Auth(
    app,
    authority=os.environ['AUTHORITY'],
    client_id=os.environ['CLIENT_ID'],
    client_credential=os.environ['CLIENT_SECRET'],
    redirect_uri=os.environ['REDIRECT_URI'],  # http://localhost:5173/auth/callback
    post_logout_view='logoutapp'
)
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

@app.route('/login', methods=['GET'])
@auth.login_required
def login(*, context):
    original_url = flask.request.args.get('originalurl')
    email = context['user'].get('preferred_username', '')
    netid = email.split('@')[0]  # Get Princeton NetID
    
    nonce = os.urandom(20).hex()
    database.put_nonce(nonce, netid)
    database.put_userinfo(netid, json.dumps(context['user']))

    response = flask.redirect(FRONTEND_URL + original_url + '?nonce=' + nonce)
    return response

@app.route('/api/gettokens', methods=['GET'])
def get_tokens():
    nonce = flask.request.args.get('nonce')
    if nonce is None:
        return None

    netid = database.get_nonce(nonce)
    if netid is None:
        return None
    database.delete_nonce(nonce)

    accesstoken = flask_jwt_extended.create_access_token(identity=netid)
    refreshtoken = flask_jwt_extended.create_refresh_token(identity=netid)

    return flask.jsonify([netid, accesstoken, refreshtoken])

@app.route('/api/refreshaccesstoken', methods=['POST'])
@flask_jwt_extended.jwt_required(refresh=True)
def refresh_accesstoken():
    new_accesstoken = flask_jwt_extended.create_access_token(
        identity=flask_jwt_extended.get_jwt_identity())
    return flask.jsonify(new_accesstoken)

@app.route('/logoutapp', methods=['GET'])
def logoutapp():
    flask.session.clear()
    return flask.jsonify({"message": "Logged out successfully"})

@app.route('/logoutentra', methods=['GET'])
def logoutentra():
    return flask.redirect(flask.url_for('identity.logout'))

@app.route('/api/getuserinfo', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_userinfo():
    netid = flask_jwt_extended.get_jwt_identity()
    userinfo = database.get_userinfo(netid)
    return userinfo

# Displaying posts API
@app.route("/api/posts", methods=["GET"])
@flask_jwt_extended.jwt_required()
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
@flask_jwt_extended.jwt_required()
def create_post():
    '''Create a new entry in the database'''
    try:
        netid = flask_jwt_extended.get_jwt_identity()
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
@flask_jwt_extended.jwt_required()
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
