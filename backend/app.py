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

# Allow smoother local dev if env vars are not set
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
APP_SECRET_KEY = os.environ.get('APP_SECRET_KEY', 'dev-secret-key')
UNRESTRICTED_CLUB_DELETE = os.environ.get('UNRESTRICTED_CLUB_DELETE', 'false').lower() == 'true'

_CAS_URL = 'https://fed.princeton.edu/cas/'

# CORS configuration for API endpoints
_allowed_origins = set()
if FRONTEND_URL:
    _allowed_origins.add(FRONTEND_URL)
# Common dev origins
_allowed_origins.update({
    'http://localhost:5173',
    'http://127.0.0.1:5173'
})
flask_cors.CORS(app, resources={r'/api/*': {'origins': list(_allowed_origins)}})

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
    database.get_or_create_member(username)
    
    response = flask.redirect(FRONTEND_URL + original_url + '?nonce=' + nonce)
    
    return response
        
#-----------------------------------------------------------------------

@app.route('/logoutapp', methods=['GET'])
def logoutapp():
    # Serve a simple logout confirmation page instead of redirecting
    logout_url = FRONTEND_URL + '/login'
    print("logout_url", logout_url)
    response = flask.redirect(logout_url)
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

@app.route('/api/health', methods=['GET'])
def health():
    return flask.jsonify({'status': 'ok'}), 200

#-----------------------------------------------------------------------
# DM / Users
#-----------------------------------------------------------------------

@app.route('/api/users', methods=['GET'])
@flask_jwt_extended.jwt_required()
def list_users():
    """Return list of member usernames for DM picker."""
    try:
        users = database.get_all_members()
        names = [u.user_name for u in users if getattr(u, 'user_name', None)]
        current = flask_jwt_extended.get_jwt_identity()
        names = [n for n in names if n != current]
        return flask.jsonify(names)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/conversations', methods=['GET'])
@flask_jwt_extended.jwt_required()
def list_conversations():
    """List conversations for the current user with last message preview."""
    try:
        current = flask_jwt_extended.get_jwt_identity()
        with database.sqlalchemy.orm.Session(database._engine) as session:
            Conversation = database.Conversation
            DMMessage = database.DMMessage
            convs = session.query(Conversation).filter(
                (Conversation.user1 == current) | (Conversation.user2 == current)
            ).order_by(Conversation.last_updated.desc()).all()

            result = []
            for c in convs:
                other = c.user2 if c.user1 == current else c.user1
                last = session.query(DMMessage).filter(DMMessage.conversation_id == c.id)\
                    .order_by(DMMessage.timestamp.desc()).first()
                entry = {
                    'conversation_id': c.id,
                    'other_user': other,
                    'last_message': getattr(last, 'text', None) if last else None,
                    'last_timestamp': getattr(last, 'timestamp', None) if last else None,
                }
                result.append(entry)
        return flask.jsonify(result)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/dm/<string:other_user>', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_dm_history(other_user):
    """Return DM history between current user and other_user."""
    try:
        current = flask_jwt_extended.get_jwt_identity()
        if other_user == current:
            return flask.jsonify({'error': 'cannot DM yourself'}), 400
        # Validate other exists
        other_member = database.get_member_by_name(other_user)
        if other_member is None:
            return flask.jsonify({'error': 'user not found'}), 404

        with database.sqlalchemy.orm.Session(database._engine) as session:
            Conversation = database.Conversation
            DMMessage = database.DMMessage
            a, b = sorted([current, other_user])
            conv = session.query(Conversation).filter(
                (Conversation.user1 == a) & (Conversation.user2 == b)
            ).first()
            if conv is None:
                return flask.jsonify([])
            msgs = session.query(DMMessage).filter(DMMessage.conversation_id == conv.id)\
                .order_by(DMMessage.timestamp.asc()).all()
            result = [
                {
                    'id': m.id,
                    'sender': m.sender,
                    'text': m.text,
                    'timestamp': m.timestamp,
                } for m in msgs
            ]
        return flask.jsonify(result)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/dm/<string:receiver>', methods=['POST'])
@flask_jwt_extended.jwt_required()
def send_dm(receiver):
    """Send a DM to receiver; create conversation if needed."""
    try:
        current = flask_jwt_extended.get_jwt_identity()
        if receiver == current:
            return flask.jsonify({'error': 'cannot DM yourself'}), 400

        # Validate receiver exists
        other_member = database.get_member_by_name(receiver)
        if other_member is None:
            return flask.jsonify({'error': 'user not found'}), 404

        data = flask.request.get_json() or {}
        text = (data.get('text') or '').strip()
        if not text:
            return flask.jsonify({'error': 'text is required'}), 400

        with database.sqlalchemy.orm.Session(database._engine) as session:
            Conversation = database.Conversation
            DMMessage = database.DMMessage
            a, b = sorted([current, receiver])
            conv = session.query(Conversation).filter(
                (Conversation.user1 == a) & (Conversation.user2 == b)
            ).first()
            if conv is None:
                conv = Conversation(user1=a, user2=b)
                session.add(conv)
                session.commit()
                session.refresh(conv)

            msg = DMMessage(conversation_id=conv.id, sender=current, text=text)
            session.add(msg)
            conv.last_updated = database.func.now()
            session.commit()
            session.refresh(msg)
        return flask.jsonify({
            'id': msg.id,
            'sender': msg.sender,
            'text': msg.text,
            'timestamp': msg.timestamp,
        })
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

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
    """Get all posts, limited to 50 most recent"""
    try:
        posts = database.get_all_posts(limit=50, order_by='post_time', order_desc=True)
        posts_dict = [model_to_dict(post) for post in posts]
        for i, post in enumerate(posts_dict):
            club_id = post['club_id']
            officer_id = post['officer_id']
            club_obj = database.get_club_by_id(club_id)
            club_name = club_obj.club_name if club_obj else None
            club_type = getattr(club_obj, 'club_type', None) if club_obj else None
            officer_obj = database.get_member_by_id(officer_id)
            officer_name = officer_obj.user_name if officer_obj else None
            officer_display_name = getattr(officer_obj, 'display_name', None) if officer_obj else None
            posts_dict[i]['club_name'] = club_name
            posts_dict[i]['club_type'] = club_type
            posts_dict[i]['officer_name'] = officer_name
            posts_dict[i]['officer_display_name'] = officer_display_name
            posts_dict[i]['timestamp'] = post.get('post_time')
        return flask.jsonify(posts_dict)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/clubs/<int:club_id>/posts', methods=['GET'])
def list_posts_by_club(club_id):
    """Get posts associated with a specific club"""
    try:
        posts = database.get_posts_by_club(club_id) or []
        posts_dict = [model_to_dict(post) for post in posts]
        for i, post in enumerate(posts_dict):
            club = database.get_club_by_id(post['club_id'])
            officer = database.get_member_by_id(post['officer_id'])
            posts_dict[i]['club_name'] = getattr(club, 'club_name', None) if club else None
            posts_dict[i]['club_type'] = getattr(club, 'club_type', None) if club else None
            posts_dict[i]['officer_name'] = getattr(officer, 'user_name', None) if officer else None
            posts_dict[i]['officer_display_name'] = getattr(officer, 'display_name', None) if officer else None
            posts_dict[i]['timestamp'] = post.get('post_time')
        return flask.jsonify(posts_dict)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


#-----------------------------------------------------------------------
# Clubs API
#-----------------------------------------------------------------------

@app.route('/api/clubs', methods=['GET'])
def list_clubs():
    """Get all clubs"""
    try:
        clubs = database.get_all_clubs()
        clubs_dict = []
        for club in clubs:
            entry = model_to_dict(club)
            # Enrich with officer names
            officer_display_names = []
            for oid in (club.club_officers or []):
                officer = database.get_member_by_id(oid)
                if officer:
                    if getattr(officer, 'display_name', None):
                        officer_display_names.append(getattr(officer, 'display_name', None) + f" ({officer.user_name})")
                    else:
                        officer_display_names.append(officer.user_name)
            entry['officer_display_names'] = officer_display_names
            clubs_dict.append(entry)
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
        officer = database.get_member_by_name(username)
        if officer is None:
            return flask.jsonify([])
        club_ids = officer.officer_clubs or []
        result = []
        for cid in club_ids:
            club = database.get_club_by_id(cid)
            if club is not None:
                entry = model_to_dict(club)
                # Enrich with officer names
                officer_display_names = []
                for oid in (club.club_officers or []):
                    officer_obj = database.get_member_by_id(oid)
                    if officer_obj:
                        if getattr(officer_obj, 'display_name', None):
                            officer_display_names.append(getattr(officer_obj, 'display_name', None) + f" ({officer_obj.user_name})")
                        else:
                            officer_display_names.append(officer_obj.user_name)
                entry['officer_display_names'] = officer_display_names
                result.append(entry)
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
            officer_obj = database.get_member_by_name(uname)
            if officer_obj is None:
                officer_obj = database.get_or_create_member(
                    user_name=uname,
                    saved_posts=[],
                    officer_clubs=[],
                    saved_clubs=[],
                    associated_posts=[]
                )
            officer_ids.append(officer_obj.user_id)

        club = database.create_club(
            club_name=club_name,
            club_profile=club_profile,
            club_type=club_type,
            club_filters=club_filters,
            club_officers=officer_ids
        )

        # Link club to each officer (officer_clubs array)
        for oid in officer_ids:
            database.add_club_to_member(oid, club.club_id)

        entry = model_to_dict(club)
        entry['officer_usernames'] = final_usernames
        return flask.jsonify({'message': 'Club created successfully', 'entry': entry})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/clubs/<int:club_id>', methods=['PUT'])
@flask_jwt_extended.jwt_required()
def update_club(club_id):
    """Update a club's information.
    Authorization: any officer listed in club_officers may edit.
    """
    try:
        club = database.get_club_by_id(club_id)
        if club is None:
            return flask.jsonify({'error': 'Club not found'}), 404

        current_user = flask_jwt_extended.get_jwt_identity()
        officer = database.get_member_by_name(current_user)
        if officer is None:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        if officer.user_id not in (club.club_officers or []):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        data = flask.request.get_json() or {}
        
        # Update basic fields
        if 'club_profile' in data:
            club = database.update_club(club_id, club_profile=data['club_profile'])
        if 'club_type' in data:
            club = database.update_club(club_id, club_type=data['club_type'])
        if 'club_filters' in data:
            club = database.update_club(club_id, club_filters=data['club_filters'])

        # Refresh to get latest
        club = database.get_club_by_id(club_id)
        entry = model_to_dict(club)
        
        # Enrich with officer names
        officer_display_names = []
        for oid in (club.club_officers or []):
            officer_obj = database.get_member_by_id(oid)
            if officer_obj:
                if getattr(officer_obj, 'display_name', None):
                    officer_display_names.append(getattr(officer_obj, 'display_name', None) + f" ({officer_obj.user_name})")
                else:
                    officer_display_names.append(officer_obj.user_name)
        entry['officer_display_names'] = officer_display_names
        
        return flask.jsonify({'message': 'Club updated successfully', 'entry': entry})
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
        officer = database.get_member_by_name(current_user)
        authorized = officer and officer.user_id in (club.club_officers or [])
        if not authorized and not UNRESTRICTED_CLUB_DELETE:
            return flask.jsonify({'error': 'Unauthorized'}), 403
        if not authorized and UNRESTRICTED_CLUB_DELETE:
            print(f"[UNRESTRICTED_CLUB_DELETE] User '{current_user}' deleting club {club.club_id} without officer authorization")

        # 1) Delete all posts for this club
        posts = database.get_posts_by_club(club_id)
        for p in posts:
            database.delete_post(p.post_id)

        # 2) Remove club from all officers' officer_clubs and saved_clubs
        officers = database.get_all_members()
        for of in officers:
            if (of.officer_clubs and club_id in of.officer_clubs):
                database.remove_club_from_member(of.user_id, club_id)
            if (of.saved_clubs and club_id in of.saved_clubs):
                database.remove_saved_club_from_member(of.user_id, club_id)

        # 3) Remove club from all users' saved_clubs
        users = database.get_all_members()
        for u in users:
            if (u.saved_clubs and club_id in u.saved_clubs):
                database.remove_saved_club_from_member(u.user_id, club_id)

        # 4) Finally, delete the club
        database.delete_club(club_id)

        return flask.jsonify({'message': 'Club deleted successfully', 'unrestricted': (not authorized and UNRESTRICTED_CLUB_DELETE)})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/clubs/<int:club_id>/leave', methods=['DELETE'])
@flask_jwt_extended.jwt_required()
def leave_club(club_id):
    """Remove current officer from club's officer list and remove club from officer's officer_clubs array"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        officer = database.get_member_by_name(current_user)
        
        if officer is None:
            return flask.jsonify({'error': 'Officer not found'}), 404
        
        club = database.get_club_by_id(club_id)
        if club is None:
            return flask.jsonify({'error': 'Club not found'}), 404
        
        # Remove officer from club's club_officers array
        if officer.user_id in (club.club_officers or []):
            print('remove_officer_from_club')
            database.remove_officer_from_club(club_id, officer.user_id)
        else:
            return flask.jsonify({'error': 'User is not an officer in the club.'})
        
        # Remove club from officer's officer_clubs array
        if club_id in (officer.officer_clubs or []):
            print('remove_club_from_member')
            database.remove_club_from_member(officer.user_id, club_id)
        else:
            return flask.jsonify({'error': 'Club is not in user\'s associated clubs.'})
        
        return flask.jsonify({'message': 'Successfully left club'})
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
        event_starttime = data.get('event_starttime')
        event_endtime = data.get('event_endtime')
        
        # Validate required fields
        if not all([post_title, club_name, officer_name, post_content, post_type]):
            return flask.jsonify({'error': 'Missing required fields'}), 400
        
        # Look up related records and ensure we have actual IDs (not model objects)
        club = database.get_club_by_name(club_name)
        if club is None:
            club = database.create_club(club_name)
        officer = database.get_member_by_name(officer_name)
        if officer is None:
            officer = database.get_or_create_member(
                officer_name,
                associated_posts=[],
                officer_clubs=[club.club_id],
                saved_posts=[],
                saved_clubs=[]
            )
        
        # Create the post using SQLAlchemy
        if event_starttime:
            post = database.create_post(
                post_title=post_title,
                club_id=club.club_id,
                officer_id=officer.user_id,
                post_content=post_content,
                post_type=post_type,
                event_starttime=event_starttime,
                event_endtime=event_endtime
            )
        else:
            post = database.create_post(
                post_title=post_title,
                club_id=club.club_id,
                officer_id=officer.user_id,
                post_content=post_content,
                post_type=post_type,
                event_endtime=event_endtime
            )
        database.add_post_to_member(officer.user_id, post.post_id)
        # database.add_post_to_club(club_id, post.post_id)
        
        # Build base entry from model
        entry = model_to_dict(post)
        # Enrich with related names (guard failures so core response still works)
        try:
            club = database.get_club_by_id(entry.get('club_id'))
            if club is not None:
                entry['club_name'] = getattr(club, 'club_name', None)
                entry['club_type'] = getattr(club, 'club_type', None)
        except Exception:
            pass
        try:
            officer = database.get_member_by_id(entry.get('officer_id'))
            if officer is not None:
                entry['officer_name'] = getattr(officer, 'user_name', None)
                entry['officer_display_name'] = getattr(officer, 'display_name', None)
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
            officer = database.get_member_by_id(entry.get('officer_id'))
            if officer is not None:
                entry['officer_name'] = getattr(officer, 'user_name', None)
                entry['officer_display_name'] = getattr(officer, 'display_name', None)
        except Exception:
            pass
        entry['timestamp'] = entry.get('post_time')
        return flask.jsonify(entry)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
@flask_jwt_extended.jwt_required()
def update_post(post_id):
    """Update a post.
    Authorization: user must be an officer of the club that owns the post.
    """
    try:
        # Fetch existing post
        existing = database.get_post_by_id(post_id)
        if existing is None:
            return flask.jsonify({'error': 'Post not found'}), 404

        # Determine club and auth context
        club = database.get_club_by_id(existing.club_id)
        if club is None:
            return flask.jsonify({'error': 'Club not found for post'}), 404

        current_user = flask_jwt_extended.get_jwt_identity()
        officer = database.get_member_by_name(current_user)
        if officer is None:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        if officer.user_id not in (club.club_officers or []):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        # Apply updates
        data = flask.request.get_json() or {}
        updated = database.update_post(post_id, **data)
        if updated is None:
            return flask.jsonify({'error': 'Failed to update'}), 500

        entry = model_to_dict(updated)
        # Enrich response similar to list endpoints
        try:
            club_obj = database.get_club_by_id(entry.get('club_id'))
            if club_obj is not None:
                entry['club_name'] = getattr(club_obj, 'club_name', None)
                entry['club_type'] = getattr(club_obj, 'club_type', None)
        except Exception:
            pass
        try:
            officer_obj = database.get_member_by_id(entry.get('officer_id'))
            if officer_obj is not None:
                entry['officer_name'] = getattr(officer_obj, 'user_name', None)
                entry['officer_display_name'] = getattr(officer_obj, 'display_name', None)
        except Exception:
            pass
        entry['timestamp'] = entry.get('post_time')

        return flask.jsonify({
            'message': 'Post updated successfully',
            'entry': entry,
            'editable': True  # Confirms caller had edit rights
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
        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'No member with inputted username.'})
        
        # Add club to saved_clubs
        success = database.add_saved_club_to_member(officer.user_id, club_id)
        
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
        
        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Officer not found'}), 404
        
        success = database.remove_saved_club_from_member(officer.user_id, club_id)
        
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
        
        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify([])  # Return empty list if officer doesn't exist yet
        
        saved_club_ids = officer.saved_clubs or []
        
        # Fetch full club details
        clubs = []
        for club_id in saved_club_ids:
            club = database.get_club_by_id(club_id)
            if club is not None:
                entry = model_to_dict(club)
                # Enrich with officer names
                officer_display_names = []
                for oid in (club.club_officers or []):
                    officer_obj = database.get_member_by_id(oid)
                    if officer_obj:
                        if getattr(officer_obj, 'display_name', None):
                            officer_display_names.append(getattr(officer_obj, 'display_name', None) + f" ({officer_obj.user_name})")
                        else:
                            officer_display_names.append(officer_obj.user_name)
                entry['officer_display_names'] = officer_display_names
                clubs.append(entry)
        
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
        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Member ID does not exist'})

        success = database.add_saved_post_to_member(officer.user_id, post_id)
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

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Officer not found'}), 404

        success = database.remove_saved_post_from_member(officer.user_id, post_id)
        if success:
            return flask.jsonify({'message': 'Post unsaved successfully'})
        else:
            return flask.jsonify({'error': 'Failed to unsave post'}), 500
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500


@app.route('/api/officers/<string:officer_name>/notepad', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_officer_notepad(officer_name):
    """Get notepad for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'notepad': ''})

        return flask.jsonify({'notepad': officer.notepad or ''})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/officers/<string:officer_name>/notepad', methods=['PUT'])
@flask_jwt_extended.jwt_required()
def update_officer_notepad(officer_name):
    """Update notepad for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        data = flask.request.get_json() or {}
        notepad = data.get('notepad', '')

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Member ID does not exist'})

        database.update_member(officer.user_id, notepad=notepad)
        return flask.jsonify({'message': 'Notepad updated successfully', 'notepad': notepad})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/officers/<string:officer_name>/preferences', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_officer_preferences(officer_name):
    """Get saved post type preferences for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'preferences': []})

        prefs = getattr(officer, 'user_preferences', []) or []
        return flask.jsonify({'preferences': prefs})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/officers/<string:officer_name>/preferences', methods=['PUT'])
@flask_jwt_extended.jwt_required()
def update_officer_preferences(officer_name):
    """Update saved post type preferences for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        data = flask.request.get_json() or {}
        preferences = data.get('preferences') or []
        if not isinstance(preferences, list):
            return flask.jsonify({'error': 'preferences must be a list of strings'}), 400

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Member ID does not exist'})

        database.update_member(officer.user_id, user_preferences=preferences)
        return flask.jsonify({'message': 'Preferences updated successfully', 'preferences': preferences})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/officers/<string:officer_name>/display-name', methods=['GET'])
@flask_jwt_extended.jwt_required()
def get_officer_display_name(officer_name):
    """Get display_name for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'display_name': ''})

        return flask.jsonify({'display_name': officer.display_name or ''})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/officers/<string:officer_name>/display-name', methods=['PUT'])
@flask_jwt_extended.jwt_required()
def update_officer_display_name(officer_name):
    """Update display_name for an officer"""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        if current_user != officer_name:
            return flask.jsonify({'error': 'Unauthorized'}), 403

        data = flask.request.get_json() or {}
        display_name = data.get('display_name', '')

        officer = database.get_member_by_name(officer_name)
        if officer is None:
            return flask.jsonify({'error': 'Member ID does not exist'})

        database.update_member(officer.user_id, display_name=display_name)
        return flask.jsonify({'message': 'Display name updated successfully', 'display_name': display_name})
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

        officer = database.get_member_by_name(officer_name)
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
                officer_obj = database.get_member_by_id(entry.get('officer_id'))
                if officer_obj is not None:
                    entry['officer_name'] = getattr(officer_obj, 'user_name', None)
                    entry['officer_display_name'] = getattr(officer_obj, 'display_name', None)
            except Exception:
                pass
            entry['timestamp'] = entry.get('post_time')
            result.append(entry)

        return flask.jsonify(result)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------
# Admin API
#-----------------------------------------------------------------------

@app.route('/api/admin/club-requests', methods=['GET'])
@flask_jwt_extended.jwt_required()
def admin_list_club_requests():
    """Return all club requests for administrators only."""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        officer = database.get_member_by_name(current_user)
        if officer is None or not getattr(officer, 'admin_status', False):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        club_requests = database.get_all_club_requests() or []
        requests_list = []
        for req in club_requests:
            entry = model_to_dict(req)
            # Enrich with officer_name and club_name
            officer_obj = database.get_member_by_id(entry.get('user_id'))
            club_obj = database.get_club_by_id(entry.get('club_id'))
            entry['user_name'] = getattr(officer_obj, 'user_name', None) if officer_obj else None
            entry['display_name'] = getattr(officer_obj, 'display_name', None) if officer_obj else None
            entry['club_name'] = getattr(club_obj, 'club_name', None) if club_obj else None
            requests_list.append(entry)
        return flask.jsonify(requests_list)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

#-----------------------------------------------------------------------
# Club Requests (user submission)
#-----------------------------------------------------------------------

@app.route('/api/club-requests', methods=['POST'])
@flask_jwt_extended.jwt_required()
def create_club_request():
    """Create a club officer request by the authenticated user."""
    try:
        data = flask.request.get_json() or {}
        club_id = data.get('club_id')
        notes = data.get('notes')
        if not club_id:
            return flask.jsonify({'error': 'club_id is required'}), 400

        username = flask_jwt_extended.get_jwt_identity()
        user = database.get_member_by_name(username)
        if user is None:
            return flask.jsonify({'error': 'User not found'}), 404

        club = database.get_club_by_id(club_id)
        if club is None:
            return flask.jsonify({'error': 'Club not found'}), 404

        # Prevent duplicate requests
        if database.exists_club_request(user.user_id, club_id):
            return flask.jsonify({'error': 'Request already exists'}), 409

        req = database.create_club_request(user.user_id, club_id, notes)
        entry = model_to_dict(req)
        entry['user_name'] = user.user_name
        entry['club_name'] = club.club_name
        return flask.jsonify({'message': 'Request submitted', 'entry': entry}), 201
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/club-requests/mine', methods=['GET'])
@flask_jwt_extended.jwt_required()
def list_my_club_requests():
    """List club requests created by the authenticated user."""
    try:
        username = flask_jwt_extended.get_jwt_identity()
        user = database.get_member_by_name(username)
        if user is None:
            return flask.jsonify([])
        reqs = database.get_club_requests_by_user(user.user_id) or []
        result = []
        for r in reqs:
            entry = model_to_dict(r)
            club = database.get_club_by_id(entry.get('club_id'))
            if club is not None:
                entry['club_name'] = getattr(club, 'club_name', None)
                entry['club_profile'] = getattr(club, 'club_profile', None)
                entry['club_type'] = getattr(club, 'club_type', None)
            result.append(entry)
        return flask.jsonify(result)
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/admin/club-requests/<int:request_id>/approve', methods=['POST'])
@flask_jwt_extended.jwt_required()
def admin_approve_club_request(request_id):
    """Approve a club request: add user as officer to the club and delete the request."""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        admin_officer = database.get_member_by_name(current_user)
        if admin_officer is None or not getattr(admin_officer, 'admin_status', False):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        req = database.get_club_request_by_id(request_id)
        if req is None:
            return flask.jsonify({'error': 'Request not found'}), 404

        # Resolve user and club
        user = database.get_member_by_id(req.user_id)
        club = database.get_club_by_id(req.club_id)
        if user is None or club is None:
            return flask.jsonify({'error': 'Invalid request data'}), 400

        # Ensure officer record exists for the username
        username = user.user_name
        officer = database.get_member_by_name(username)
        if officer is None:
            return flask.jsonify({'error': 'Approved officer does not exist'})

        # Add officer to the club if not already
        if not database.add_officer_to_club(club.club_id, officer.user_id):
            print('add_officer_to_club did not work')
            return flask.jsonify({'error': 'Couldn\'t add officer to club'})
        # Link club to officer
        if not database.add_club_to_member(officer.user_id, club.club_id):
            print('add_club_to_member does not work')
            return flask.jsonify({'error': 'Could not add club to member'})

        # Delete the request
        database.delete_club_request(request_id)

        entry = model_to_dict(club)
        return flask.jsonify({'message': 'Approved', 'club': entry, 'officer_username': username})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/admin/club-requests/<int:request_id>', methods=['DELETE'])
@flask_jwt_extended.jwt_required()
def admin_reject_club_request(request_id):
    """Reject a club request: delete the request."""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        admin_officer = database.get_member_by_name(current_user)
        if admin_officer is None or not getattr(admin_officer, 'admin_status', False):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        ok = database.delete_club_request(request_id)
        if not ok:
            return flask.jsonify({'error': 'Request not found'}), 404
        return flask.jsonify({'message': 'Rejected'})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500

@app.route('/api/admin/conversations/<int:conversation_id>', methods=['DELETE'])
@flask_jwt_extended.jwt_required()
def admin_delete_conversation(conversation_id):
    """Delete a conversation and all its messages."""
    try:
        current_user = flask_jwt_extended.get_jwt_identity()
        admin_officer = database.get_member_by_name(current_user)
        if admin_officer is None or not getattr(admin_officer, 'admin_status', False):
            return flask.jsonify({'error': 'Unauthorized'}), 403

        ok = database.delete_conversation(conversation_id)
        if not ok:
            return flask.jsonify({'error': 'Conversation not found'}), 404
        return flask.jsonify({'message': 'Conversation deleted'})
    except Exception as e:
        return flask.jsonify({'error': str(e)}), 500
