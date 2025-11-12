import flask
import flask_cors
import os
import datetime
import json
import dotenv
import flask_jwt_extended
import re
import urllib.parse
import urllib.request
import database

app = flask.Flask(__name__)
dotenv.load_dotenv('../.env')

FRONTEND_URL = os.environ['FRONTEND_URL']
APP_SECRET_KEY = os.environ['APP_SECRET_KEY']

_CAS_URL = 'https://fed.princeton.edu/cas/'

# CORS configuration for API endpoints
flask_cors.CORS(app, resources={r'/api/*': {'origins': FRONTEND_URL}})

# JWT Configuration
app.config['JWT_SECRET_KEY'] = APP_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = datetime.timedelta(days=1)
jwtManager = flask_jwt_extended.JWTManager(app)

#-----------------------------------------------------------------------
# Helper functions for authentication:
#-----------------------------------------------------------------------

# Return url after stripping out the "ticket" parameter that was
# added by the CAS server.

def strip_ticket(url):
    if url is None:
        return "something is badly wrong"
    url = re.sub(r'ticket=[^&]*&?', '', url)
    url = re.sub(r'\?&?$|&$', '', url)
    return url

#-----------------------------------------------------------------------

def validate(ticket):
    val_url = (_CAS_URL + "validate?service=" 
               + urllib.parse.quote(strip_ticket(flask.request.url)) 
               + "&ticket=" + urllib.parse.quote(ticket) 
               + "&format=json")
    with urllib.request.urlopen(val_url) as flo:
        result = json.loads(flo.read().decode('utf-8'))
        
    if (not result) or ('serviceResponse' not in result):
        return None
    
    service_response = result['serviceResponse']
    
    if 'authenticationSuccess' in service_response:
        userinfo = service_response['authenticationSuccess']
        return userinfo

    if 'authenticationFailure' in service_response:
        print('CAS authentication failure:', service_response)
        return None

    print('Unexpected CAS response:', service_response)
    return None
    
#-----------------------------------------------------------------------
# Routes for authentication:
#-----------------------------------------------------------------------

@app.route('/login', methods=['GET'])
def login():
    original_url = flask.request.args.get('originalurl')
    if original_url is None:
        original_url = '/'
    
    # If the request does not contain a login ticket, then redirect
    # the browser to the login page to get one.
    ticket = flask.request.args.get('ticket')
    if ticket is None:
        login_url = (_CAS_URL + "login?service=" + urllib.parse.quote(flask.request.url))
        flask.abort(flask.redirect(login_url))
        
    # If the login ticket is invalid, then redirect the browser
    # to the login page to get a new one.
    userinfo = validate(ticket)
    if userinfo is None:
        login_url = (_CAS_URL + "login?service=" + urllib.parse.quote(strip_ticket(flask.request.url)))
        flask.abort(flask.redirect(login_url))
        
    # The login ticket is valid, so create/update the user in the database,
    # and redirect the browser to the client with a nonce as an
    # argument.
    nonce = os.urandom(20).hex()
    username = userinfo['user']
    username = username.strip().lower()
    database.put_nonce(nonce, username)
    # Create or get the user record for the application
    database.get_or_create_user(username)
    
    response = flask.redirect(FRONTEND_URL + original_url + '?nonce=' + nonce)
    
    return response
        
#-----------------------------------------------------------------------

@app.route('/logoutapp', methods=['GET'])
def logoutapp():
    # We can't invalidate the JWTs. The best we can do is ask the
    # frontend to discard the JWTs.
    
    response = flask.redirect(FRONTEND_URL + '/logout')
    return response

#-----------------------------------------------------------------------

@app.route('/logoutcas', methods=['GET'])
def logoutcas():
    # Log out of the CAS session, and then the application.
    logout_url = (_CAS_URL + 'logout?service=' + urllib.parse.quote(re.sub('logoutcas', 'logoutapp', flask.request.url)))
    response = flask.redirect(logout_url)
    return response

#-----------------------------------------------------------------------
# API routes:
#-----------------------------------------------------------------------

@app.route('/api/gettokens', methods=['GET'])
def get_tokens():
    nonce = flask.request.args.get('nonce')
    if nonce is None:
        return flask.jsonify({'error': 'missing nonce'}), 400

    username = database.get_nonce(nonce)
    if username is None:
        return flask.jsonify({'error': 'invalid nonce'}), 400
    database.delete_nonce(nonce)

    accesstoken = flask_jwt_extended.create_access_token(identity=username)
    refreshtoken = flask_jwt_extended.create_refresh_token(identity=username)

    return flask.jsonify([username, accesstoken, refreshtoken])

#-----------------------------------------------------------------------

@app.route('/api/refreshaccesstoken', methods=['POST'])
@flask_jwt_extended.jwt_required(refresh=True)
def refresh_accesstoken():
    new_accesstoken = flask_jwt_extended.create_access_token(identity=flask_jwt_extended.get_jwt_identity())
    
    response = flask.jsonify(new_accesstoken)
    return response

#-----------------------------------------------------------------------
# Helper function to convert SQLAlchemy model to dict
#-----------------------------------------------------------------------

def model_to_dict(model):
    """Convert a SQLAlchemy model instance to a dictionary"""
    if model is None:
        return None
    result = {}
    for column in model.__table__.columns:
        value = getattr(model, column.name)
        # Convert datetime objects to ISO format strings
        if isinstance(value, datetime.datetime):
            value = value.isoformat()
        result[column.name] = value
    return result

#-----------------------------------------------------------------------
# Posts API
#-----------------------------------------------------------------------

@app.route("/api/posts", methods=["GET"])
def list_posts():
    """Get all posts, limited to 5 most recent"""
    try:
        posts = database.get_all_posts(limit=5, order_by='post_time', order_desc=True)
        posts_dict = [model_to_dict(post) for post in posts]
        return flask.jsonify(posts_dict)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/posts', methods=['POST'])
def create_post():
    """Create a new post"""
    try:
        data = flask.request.get_json()
        post_title = data.get('post_title')
        club_name = data.get('club_name')
        officer_name = data.get('officer_name')
        post_content = data.get('post_content')
        post_type = data.get('post_type')
        
        # Validate required fields
        if not all([post_title, club_name, officer_name, post_content, post_type]):
            return flask.jsonify({'error': 'Missing required fields'}), 400
        
        club_id = database.get_club_by_name(club_name)
        officer_id = database.get_officer_by_name(officer_name)
        if club_id is None:
            database.create_club(club_name)
            club_id = database.get_club_by_name(club_name).club_id
        if officer_id is None:
            database.create_officer(officer_name, associated_posts=[], officer_clubs=[club_id], saved_posts=[], saved_clubs=[])
            officer_id = database.get_officer_by_name(officer_name).officer_id
        
        # Create the post using SQLAlchemy
        post = database.create_post(
            post_title=post_title,
            club_id=club_id,
            officer_id=officer_id,
            post_content=post_content,
            post_type=post_type
        )
        database.add_post_to_officer(officer_id, post.post_id)
        database.add_post_to_club(club_id, post.post_id)
        
        return flask.jsonify({
            'message': 'Post created successfully',
            'entry': model_to_dict(post)
        })
                
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    """Get a single post by ID"""
    try:
        post = database.get_post_by_id(post_id)
        if post is None:
            return flask.jsonify({'error': 'Post not found'}), 404
        return flask.jsonify(model_to_dict(post))
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    """Update a post"""
    try:
        data = flask.request.get_json()
        post = database.update_post(post_id, **data)
        if post is None:
            return flask.jsonify({'error': 'Post not found'}), 404
        return flask.jsonify({
            'message': 'Post updated successfully',
            'entry': model_to_dict(post)
        })
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/posts/<int:post_id>', methods=["DELETE"])
def delete_post(post_id):
    """Delete a post"""
    try:
        success = database.delete_post(post_id)
        if not success:
            return flask.jsonify({'error': 'Post not found'}), 404
        return flask.jsonify({"message": "Post deleted successfully"})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500
