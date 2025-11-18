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
dotenv.load_dotenv()

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
    # Return standardized object instead of array for clarity
    return flask.jsonify({
        'username': username,
        'access': accesstoken,
        'refresh': refreshtoken
    })

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
    """Get all posts, limited to 20 most recent"""
    try:
        posts = database.get_all_posts(limit=20, order_by='post_time', order_desc=True)
        posts_dict = [model_to_dict(post) for post in posts]
        for i, post in enumerate(posts_dict):
            club_id = post['club_id']
            officer_id = post['officer_id']
            club_name = database.get_club_by_id(club_id).club_name
            officer_name = database.get_officer_by_id(officer_id).officer_name
            posts_dict[i]['club_name'] = club_name
            posts_dict[i]['officer_name'] = officer_name
            posts_dict[i]['timestamp'] = post.get('post_time')
        return flask.jsonify(posts_dict)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

#-----------------------------------------------------------------------
# Clubs API
#-----------------------------------------------------------------------

@app.route('/api/clubs', methods=['GET'])
def list_clubs():
    """Get all clubs"""
    try:
        clubs = database.get_all_clubs()
        clubs_dict = [model_to_dict(c) for c in clubs]
        return flask.jsonify(clubs_dict)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/api/clubs/mine', methods=['GET'])
@flask_jwt_extended.jwt_required()
def list_my_officer_clubs():
    """Get clubs where the current user is an officer"""
    try:
        username = flask_jwt_extended.get_jwt_identity()
        # Officer names correspond to usernames/netids in this app
        officer = database.get_officer_by_name(username)
        if officer is None:
            return flask.jsonify([])
        club_ids = officer.officer_clubs or []
        result = []
        for cid in club_ids:
            club = database.get_club_by_id(cid)
            if club is not None:
                result.append(model_to_dict(club))
        return flask.jsonify(result)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/api/clubs', methods=['POST'])
@flask_jwt_extended.jwt_required()
def create_club():
    """Create a new club and add creator as an officer"""
    try:
        data = flask.request.get_json() or {}
        club_name = (data.get('club_name') or '').strip()
        club_profile = data.get('club_profile') or ''
        club_type = data.get('club_type') or ''
        club_filters = data.get('club_filters') or []
        # New: list of officer usernames provided by client (netids)
        officer_usernames = data.get('officer_usernames') or []

        if not club_name:
            return flask.jsonify({'error': 'Missing club_name'}), 400

        username = flask_jwt_extended.get_jwt_identity()
        # Normalize officer usernames: ensure creator included, lowercase, unique
        normalized = []
        for name in officer_usernames:
            if isinstance(name, str):
                n = name.strip().lower()
                if n:
                    normalized.append(n)
        creator_norm = username.strip().lower()
        if creator_norm not in normalized:
            normalized.append(creator_norm)
        # De-duplicate while preserving order
        seen = set()
        final_usernames = []
        for n in normalized:
            if n not in seen:
                seen.add(n)
                final_usernames.append(n)

        # Prevent duplicate clubs by name
        existing = database.get_club_by_name(club_name)
        if existing is not None:
            return flask.jsonify({'error': 'Club name already exists'}), 409

        # Ensure officer records exist and collect their IDs
        officer_ids = []
        for uname in final_usernames:
            officer_obj = database.get_officer_by_name(uname)
            if officer_obj is None:
                officer_obj = database.create_officer(
                    officer_name=uname,
                    saved_posts=[],
                    officer_clubs=[],
                    saved_clubs=[],
                    associated_posts=[]
                )
            officer_ids.append(officer_obj.officer_id)

        club = database.create_club(
            club_name=club_name,
            club_profile=club_profile,
            club_type=club_type,
            club_filters=club_filters,
            club_officers=officer_ids
        )

        # Link club to each officer (officer_clubs array)
        for oid in officer_ids:
            database.add_club_to_officer(oid, club.club_id)

        entry = model_to_dict(club)
        entry['officer_usernames'] = final_usernames
        return flask.jsonify({'message': 'Club created successfully', 'entry': entry})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/clubs/<int:club_id>', methods=['DELETE'])
@flask_jwt_extended.jwt_required()
def delete_club(club_id):
    """Delete a club and cascade-delete its posts; clean officer/user references.
    Authorization: any officer listed in club_officers may delete.
    """
    try:
        club = database.get_club_by_id(club_id)
        if club is None:
            return flask.jsonify({'error': 'Club not found'}), 404

        current_user = flask_jwt_extended.get_jwt_identity()
        officer = database.get_officer_by_name(current_user)
        if officer is None:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        if officer.officer_id not in (club.club_officers or []):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        # 1) Delete all posts for this club
        posts = database.get_posts_by_club(club_id)
        for p in posts:
            database.delete_post(p.post_id)

        # 2) Remove club from all officers' officer_clubs and saved_clubs
        officers = database.get_all_officers()
        for of in officers:
            if (of.officer_clubs and club_id in of.officer_clubs):
                database.remove_club_from_officer(of.officer_id, club_id)
            if (of.saved_clubs and club_id in of.saved_clubs):
                database.remove_saved_club_from_officer(of.officer_id, club_id)

        # 3) Remove club from all users' saved_clubs
        users = database.get_all_users()
        for u in users:
            if (u.saved_clubs and club_id in u.saved_clubs):
                database.remove_saved_club_from_user(u.user_id, club_id)

        # 4) Finally, delete the club
        database.delete_club(club_id)

        return flask.jsonify({'message': 'Club deleted successfully'})
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
        
        # Look up related records and ensure we have actual IDs (not model objects)
        club = database.get_club_by_name(club_name)
        if club is None:
            club = database.create_club(club_name)
        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            officer = database.create_officer(
                officer_name,
                associated_posts=[],
                officer_clubs=[club.club_id],
                saved_posts=[],
                saved_clubs=[]
            )
        
        # Create the post using SQLAlchemy
        post = database.create_post(
            post_title=post_title,
            club_id=club.club_id,
            officer_id=officer.officer_id,
            post_content=post_content,
            post_type=post_type
        )
        database.add_post_to_officer(officer.officer_id, post.post_id)
        # database.add_post_to_club(club_id, post.post_id)
        
        # Build base entry from model
        entry = model_to_dict(post)
        # Enrich with related names (guard failures so core response still works)
        try:
            club = database.get_club_by_id(entry.get('club_id'))
            if club is not None:
                entry['club_name'] = getattr(club, 'club_name', None)
        except Exception:
            pass
        try:
            officer = database.get_officer_by_id(entry.get('officer_id'))
            if officer is not None:
                entry['officer_name'] = getattr(officer, 'officer_name', None)
        except Exception:
            pass

        return flask.jsonify({
            'message': 'Post created successfully',
            'entry': entry

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
        entry = model_to_dict(post)
        try:
            club = database.get_club_by_id(entry.get('club_id'))
            if club is not None:
                entry['club_name'] = getattr(club, 'club_name', None)
        except Exception:
            pass
        try:
            officer = database.get_officer_by_id(entry.get('officer_id'))
            if officer is not None:
                entry['officer_name'] = getattr(officer, 'officer_name', None)
        except Exception:
            pass
        entry['timestamp'] = entry.get('post_time')
        return flask.jsonify(entry)
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

#-----------------------------------------------------------------------
# Officer saved clubs API
#-----------------------------------------------------------------------

@app.route('/api/officers/<string:officer_name>/saved-clubs', methods=['POST'])
@flask_jwt_extended.jwt_required()
def save_club_to_officer(officer_name):
    """Save a club to an officer's saved_clubs"""
    try:
        # Verify the authenticated user matches the officer_name
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403
        
        data = flask.request.get_json()
        club_id = data.get('club_id')
        
        if not club_id:
            return flask.jsonify({'error': 'club_id is required'}), 400
        
        # Get or create officer
        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            officer = database.create_officer(officer_name)
        
        # Add club to saved_clubs
        success = database.add_saved_club_to_officer(officer.officer_id, club_id)
        
        if success:
            return flask.jsonify({'message': 'Club saved successfully'})
        else:
            return flask.jsonify({'error': 'Failed to save club'}), 500
            
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/officers/<string:officer_name>/saved-clubs/<int:club_id>', methods=['DELETE'])
@flask_jwt_extended.jwt_required()
def unsave_club_from_officer(officer_name, club_id):
    """Remove a club from an officer's saved_clubs"""
    try:
        # Verify the authenticated user matches the officer_name
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403
        
        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Officer not found'}), 404
        
        success = database.remove_saved_club_from_officer(officer.officer_id, club_id)
        
        if success:
            return flask.jsonify({'message': 'Club unsaved successfully'})
        else:
            return flask.jsonify({'error': 'Failed to unsave club'}), 500
            
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/officers/<string:officer_name>/saved-clubs', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_saved_clubs_for_officer(officer_name):
    """Get all saved clubs for an officer"""
    try:
        # Verify the authenticated user matches the officer_name
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403
        
        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            return flask.jsonify([])  # Return empty list if officer doesn't exist yet
        
        saved_club_ids = officer.saved_clubs or []
        
        # Fetch full club details
        clubs = []
        for club_id in saved_club_ids:
            club = database.get_club_by_id(club_id)
            if club is not None:
                clubs.append(model_to_dict(club))
        
        return flask.jsonify(clubs)
        
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


#-----------------------------------------------------------------------
# Officer saved posts API (save by post_id)
#-----------------------------------------------------------------------

@app.route('/api/officers/<string:officer_name>/saved-posts', methods=['POST'])
@flask_jwt_extended.jwt_required()
def save_post_to_officer(officer_name):
    """Save a post (by post_id) to an officer's saved_posts"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        data = flask.request.get_json()
        post_id = data.get('post_id')
        if not post_id:
            return flask.jsonify({'error': 'post_id is required'}), 400

        # Ensure officer exists
        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            officer = database.create_officer(officer_name)

        success = database.add_saved_post_to_officer(officer.officer_id, post_id)
        if success:
            return flask.jsonify({'message': 'Post saved successfully'})
        else:
            return flask.jsonify({'error': 'Failed to save post'}), 500
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/api/officers/<string:officer_name>/saved-posts/<int:post_id>', methods=['DELETE'])
@flask_jwt_extended.jwt_required()
def unsave_post_from_officer(officer_name, post_id):
    """Remove a post (by post_id) from an officer's saved_posts"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Officer not found'}), 404

        success = database.remove_saved_post_from_officer(officer.officer_id, post_id)
        if success:
            return flask.jsonify({'message': 'Post unsaved successfully'})
        else:
            return flask.jsonify({'error': 'Failed to unsave post'}), 500
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/api/officers/<string:officer_name>/saved-posts', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_saved_posts_for_officer(officer_name):
    """Get all saved posts (with enrichment) for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        officer = database.get_officer_by_name(officer_name)
        if officer is None:
            return flask.jsonify([])

        saved_post_ids = officer.saved_posts or []
        result = []
        for pid in saved_post_ids:
            p = database.get_post_by_id(pid)
            if p is None:
                continue
            entry = model_to_dict(p)
            # Enrich
            try:
                club = database.get_club_by_id(entry.get('club_id'))
                if club is not None:
                    entry['club_name'] = getattr(club, 'club_name', None)
            except Exception:
                pass
            try:
                officer_obj = database.get_officer_by_id(entry.get('officer_id'))
                if officer_obj is not None:
                    entry['officer_name'] = getattr(officer_obj, 'officer_name', None)
            except Exception:
                pass
            entry['timestamp'] = entry.get('post_time')
            result.append(entry)

        return flask.jsonify(result)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

