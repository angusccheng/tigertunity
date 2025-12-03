import os
import dotenv
import sqlalchemy

from sqlalchemy import Column, Integer, Text, Boolean, ARRAY, func, ForeignKey, TIMESTAMP
import sqlalchemy.orm

#-----------------------------------------------------------------------

dotenv.load_dotenv()
_database_url = os.getenv('NEON_URL')

#-----------------------------------------------------------------------

class Base(sqlalchemy.orm.DeclarativeBase):
    pass

class Post(Base):
    __tablename__ = 'post_table'
    post_id = Column(Integer, primary_key=True, autoincrement=True)
    post_title = Column(Text, nullable=False)
    club_id = Column(Integer, ForeignKey("club_table.club_id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("officer_table.officer_id"), nullable=False)
    post_content = Column(Text, nullable=False)
    post_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    post_type = Column(Text, nullable=False)
    edit_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    edit_status = Column(Boolean, default=False)
    event_starttime = Column(TIMESTAMP(timezone=True), nullable=True)
    event_endtime = Column(TIMESTAMP(timezone=True), nullable=True)

class Member(Base):
    __tablename__ = "members_table"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    user_name = Column(Text, nullable=False)
    saved_posts = Column(ARRAY(Integer), default=[])
    saved_clubs = Column(ARRAY(Integer), default=[])
    officer_clubs = Column(ARRAY(Integer), default=[])
    associated_posts = Column(ARRAY(Integer), default=[])
    notepad = Column(Text, default='')
    display_name = Column(Text, default='')
    user_preferences = Column(ARRAY(Text), default=[])
    admin_status = Column(Boolean, default=False)

class Club(Base):
    __tablename__ = "club_table"
    club_id = Column(Integer, primary_key=True, autoincrement=True)
    club_name = Column(Text, nullable=False)
    club_profile = Column(Text, nullable=False)
    club_type = Column(Text, nullable=False)
    club_filters = Column(ARRAY(Text), default=[])
    club_officers = Column(ARRAY(Integer), default=[])
    president = Column(Integer, ForeignKey("officer_table.officer_id"))
    vice_president = Column(Integer, ForeignKey("officer_table.officer_id"))
    treasurer = Column(Integer, ForeignKey("officer_table.officer_id"))
    
class ClubRequest(Base):
    __tablename__ = "club_requests"
    request_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    club_id = Column(Integer, nullable=False)
    request_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    notes = Column(Text)
    
class Nonce(Base):
    __tablename__ = 'nonces'
    nonce = sqlalchemy.Column(sqlalchemy.String, primary_key=True)
    username = sqlalchemy.Column(sqlalchemy.String)


# ---------------- DM TABLES -----------------

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user1 = Column(Text, nullable=False)
    user2 = Column(Text, nullable=False)
    last_updated = Column(TIMESTAMP(timezone=True), server_default=func.now())


class DMMessage(Base):
    __tablename__ = "dm_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender = Column(Text, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), server_default=func.now())


_engine = sqlalchemy.create_engine(_database_url)

# Create DM tables if they don't exist (safe for existing tables)
Base.metadata.create_all(_engine)

#-----------------------------------------------------------------------
# Nonce operations
#-----------------------------------------------------------------------

def get_nonce(nonce):
    with sqlalchemy.orm.Session(_engine) as session:
        query = session.query(Nonce).filter(
            Nonce.nonce == nonce)
        table = query.all()
        if len(table) == 0:
            return None
        return table[0].username
    
#-----------------------------------------------------------------------

def put_nonce(nonce, username):
    with sqlalchemy.orm.Session(_engine) as session:
        new_nonce = Nonce(nonce=nonce, username=username)
        session.add(new_nonce)
        session.commit()
        
#-----------------------------------------------------------------------

def delete_nonce(nonce):
    with sqlalchemy.orm.Session(_engine) as session:
        query = session.query(Nonce).filter(Nonce.nonce==nonce)
        table = query.all()
        for row in table:
            session.delete(row)
        session.commit()
        
#-----------------------------------------------------------------------
# Post operations
#-----------------------------------------------------------------------

def get_post_by_id(post_id):
    """Get a post by post_id"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Post).filter(Post.post_id == post_id).first()

def get_all_posts(limit=None, order_by='post_time', order_desc=True):
    """Get all posts, optionally with limit and ordering"""
    with sqlalchemy.orm.Session(_engine) as session:
        query = session.query(Post)
        order_column = getattr(Post, order_by, Post.post_time)
        if order_desc:
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column)
        if limit:
            query = query.limit(limit)
        return query.all()

def get_posts_by_club(club_id, limit=None):
    """Get all posts for a specific club"""
    with sqlalchemy.orm.Session(_engine) as session:
        query = session.query(Post).filter(Post.club_id == club_id).order_by(Post.post_time.desc())
        if limit:
            query = query.limit(limit)
        return query.all()

def get_posts_by_officer(officer_id, limit=None):
    """Get all posts by a specific officer"""
    with sqlalchemy.orm.Session(_engine) as session:
        query = session.query(Post).filter(Post.officer_id == officer_id).order_by(Post.post_time.desc())
        if limit:
            query = query.limit(limit)
        return query.all()

def get_posts_by_type(post_type, limit=None):
    """Get all posts of a specific type"""
    with sqlalchemy.orm.Session(_engine) as session:
        query = session.query(Post).filter(Post.post_type == post_type).order_by(Post.post_time.desc())
        if limit:
            query = query.limit(limit)
        return query.all()

def create_post(post_title, club_id, officer_id, post_content, post_type, event_starttime=None, event_endtime=None):
    """Create a new post"""
    with sqlalchemy.orm.Session(_engine) as session:
        post = Post(
            post_title=post_title,
            club_id=club_id,
            officer_id=officer_id,
            post_content=post_content,
            post_type=post_type,
            event_starttime=event_starttime,
            event_endtime=event_endtime
        )
        session.add(post)
        session.commit()
        session.refresh(post)
        return post

def update_post(post_id, **kwargs):
    """Update post fields"""
    with sqlalchemy.orm.Session(_engine) as session:
        post = session.query(Post).filter(Post.post_id == post_id).first()
        if post is None:
            return None
        for key, value in kwargs.items():
            if hasattr(post, key):
                setattr(post, key, value)
        post.edit_time = func.now()
        post.edit_status = True
        session.commit()
        session.refresh(post)
        return post

def delete_post(post_id):
    """Delete a post by post_id"""
    with sqlalchemy.orm.Session(_engine) as session:
        post = session.query(Post).filter(Post.post_id == post_id).first()
        if post is None:
            return False
        session.delete(post)
        session.commit()
        return True

#-----------------------------------------------------------------------
# Member operations
#-----------------------------------------------------------------------

def get_member_by_id(user_id):
    """Get a member by user_id"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Member).filter(Member.user_id == user_id).first()

def get_member_by_name(user_name):
    """Get a member by name"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Member).filter(Member.user_name == user_name).first()

def get_all_members():
    """Get all members"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Member).all()

def get_or_create_member(user_name, saved_posts=None, saved_clubs=None, officer_clubs=None, associated_posts=None):
    """Create a new member or get a member if they already exist"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_name == user_name).first()
        if member is None:
            member = Member(
                user_name=user_name, 
                saved_posts=saved_posts or [], 
                saved_clubs=saved_clubs or [], 
                officer_clubs=officer_clubs or [], 
                associated_posts=associated_posts or []
            )
            session.add(member)
            session.commit()
            session.refresh(member)
        return member

def update_member(user_id, **kwargs):
    """Update member fields"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None:
            return None
        for key, value in kwargs.items():
            if hasattr(member, key):
                setattr(member, key, value)
        session.commit()
        session.refresh(member)
        return member

def delete_member(user_id):
    """Delete a member by user_id"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None:
            return False
        session.delete(member)
        session.commit()
        return True
    
def add_club_to_member(user_id, club_id):
    """Add a club_id to member's officer_clubs array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None:
            return False
        if member.officer_clubs is None:
            member.officer_clubs = []
        if club_id not in member.officer_clubs:
            # Create a new list to trigger SQLAlchemy change detection
            member.officer_clubs = member.officer_clubs + [club_id]
        session.commit()
        return True
    
def remove_club_from_member(user_id, club_id):
    """Remove a club_id from member's officer_clubs array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None or member.officer_clubs is None:
            return False
        if club_id in member.officer_clubs:
            member.officer_clubs = [cid for cid in (member.officer_clubs or []) if cid != club_id]
            session.commit()
        return True

def add_post_to_member(user_id, post_id):
    """Add a post_id to member's associated_posts array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None:
            return False
        if member.associated_posts is None:
            member.associated_posts = []
        if post_id not in member.associated_posts:
            member.associated_posts = member.associated_posts + [post_id]
        session.commit()
        return True

def add_saved_post_to_member(user_id, post_id):
    """Add a post_id to of member's saved_posts array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None:
            return False
        # Create a new list to trigger SQLAlchemy update detection
        current = member.saved_posts or []
        if post_id not in current:
            member.saved_posts = current + [post_id]
            session.commit()
        return True

def remove_saved_post_from_member(user_id, post_id):
    """Remove a post_id from member's saved_posts array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None or member.saved_posts is None:
            return False
        # Create a new list to trigger SQLAlchemy update detection
        current = member.saved_posts or []
        if post_id in current:
            member.saved_posts = [pid for pid in current if pid != post_id]
            session.commit()
        return True

def add_saved_club_to_member(user_id, club_id):
    """Add a club_id to member's saved_clubs array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None:
            return False
        if member.saved_clubs is None:
            member.saved_clubs = []
        if club_id not in member.saved_clubs:
            member.saved_clubs = member.saved_clubs + [club_id]
        session.commit()
        return True

def remove_saved_club_from_member(user_id, club_id):
    """Remove a club_id from member's saved_clubs array"""
    with sqlalchemy.orm.Session(_engine) as session:
        member = session.query(Member).filter(Member.user_id == user_id).first()
        if member is None or member.saved_clubs is None:
            return False
        if club_id in member.saved_clubs:
            member.saved_clubs.remove(club_id)
        session.commit()
        return True
    
def get_member_admin_status(user_id):
    """Check the admin status of a member"""
    with sqlalchemy.orm.Session(_engine) as session:
        status = session.query(Member.admin_status).filter(Member.user_id == user_id).scalar()
        return status
        
#-----------------------------------------------------------------------
# Club operations
#-----------------------------------------------------------------------

def get_club_by_id(club_id):
    """Get a club by club_id"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Club).filter(Club.club_id == club_id).first()

def get_club_by_name(club_name):
    """Get a club by club_name"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Club).filter(Club.club_name == club_name).first()

def get_clubs_by_type(club_type):
    """Get all clubs of a specific type"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Club).filter(Club.club_type == club_type).all()

def get_all_clubs():
    """Get all clubs"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(Club).all()

def create_club(club_name, club_profile="", club_type="", club_filters=None, club_officers=None,
                president=None, vice_president=None, treasurer=None):
    """Create a new club"""
    with sqlalchemy.orm.Session(_engine) as session:
        club = Club(
            club_name=club_name,
            club_profile=club_profile,
            club_type=club_type,
            club_filters=club_filters or [],
            club_officers=club_officers or [],
            president=president,
            vice_president=vice_president,
            treasurer=treasurer
        )
        session.add(club)
        session.commit()
        session.refresh(club)
        return club

def update_club(club_id, **kwargs):
    """Update club fields"""
    with sqlalchemy.orm.Session(_engine) as session:
        club = session.query(Club).filter(Club.club_id == club_id).first()
        if club is None:
            return None
        for key, value in kwargs.items():
            if hasattr(club, key):
                setattr(club, key, value)
        session.commit()
        session.refresh(club)
        return club

def delete_club(club_id):
    """Delete a club by club_id"""
    with sqlalchemy.orm.Session(_engine) as session:
        club = session.query(Club).filter(Club.club_id == club_id).first()
        if club is None:
            return False
        session.delete(club)
        session.commit()
        return True

def add_officer_to_club(club_id, officer_id):
    """Add an officer_id to club's club_officers array"""
    with sqlalchemy.orm.Session(_engine) as session:
        club = session.query(Club).filter(Club.club_id == club_id).first()
        if club is None:
            return False
        if club.club_officers is None:
            club.club_officers = []
        if officer_id not in club.club_officers:
            club.club_officers = club.club_officers + [officer_id]
        session.commit()
        return True

def remove_officer_from_club(club_id, officer_id):
    """Remove an officer_id from club's club_officers array"""
    with sqlalchemy.orm.Session(_engine) as session:
        club = session.query(Club).filter(Club.club_id == club_id).first()
        if club is None or club.club_officers is None:
            return False
        if officer_id in club.club_officers:
            club.club_officers.remove(officer_id)
        session.commit()
        return True
    
#-----------------------------------------------------------------------
# Club Request operations
#-----------------------------------------------------------------------

def get_all_club_requests():
    """Get all of the club requests"""
    with sqlalchemy.orm.Session(_engine) as session:
        club_requests = session.query(ClubRequest).all()
        return club_requests

def create_club_request(user_id, club_id, notes=None):
    """Create a new club request"""
    with sqlalchemy.orm.Session(_engine) as session:
        req = ClubRequest(user_id=user_id, club_id=club_id, notes=notes)
        session.add(req)
        session.commit()
        session.refresh(req)
        return req

def get_club_requests_by_user(user_id):
    """Get all club requests created by a given user"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(ClubRequest).filter(ClubRequest.user_id == user_id).all()

def get_club_request_by_id(request_id):
    """Get a single club request by id"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(ClubRequest).filter(ClubRequest.request_id == request_id).first()

def delete_club_request(request_id):
    """Delete a club request by id"""
    with sqlalchemy.orm.Session(_engine) as session:
        req = session.query(ClubRequest).filter(ClubRequest.request_id == request_id).first()
        if req is None:
            return False
        session.delete(req)
        session.commit()
        return True

def exists_club_request(user_id, club_id):
    """Check if a club request already exists for user and club"""
    with sqlalchemy.orm.Session(_engine) as session:
        return session.query(ClubRequest).filter(ClubRequest.user_id == user_id, ClubRequest.club_id == club_id).first() is not None
