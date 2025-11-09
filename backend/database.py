import os
from sqlalchemy import Column, Integer, Text, Boolean, ARRAY, ForeignKey, TIMESTAMP
import sqlalchemy.orm
import dotenv

dotenv.load_dotenv()
_database_url = os.getenv('NEON_URL')


class Base(sqlalchemy.orm.DeclarativeBase):
    pass

class Post(Base):
    __tablename__ = 'post_table'
    
    post_id = Column(Integer, primary_key=True, autoincrement=True)
    post_title = Column(Text, nullable=False)
    club_id = Column(Integer, ForeignKey("club_table.club_id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("officer_table.officer_id"), nullable=False)
    post_content = Column(Text, nullable=False)
    post_time = Column(TIMESTAMP, server_default=func.now())
    post_type = Column(Text, nullable=False)
    edit_time = Column(TIMESTAMP, server_default=func.now())
    edit_status = Column(Boolean, default=False)
    
class User(Base):
    __tablename__ = "user_table"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    user_name = Column(Text, nullable=False)
    saved_posts = Column(ARRAY(Integer), default=[])
    saved_clubs = Column(ARRAY(Integer), default=[])


class Officer(Base):
    __tablename__ = "officer_table"
    officer_id = Column(Integer, primary_key=True, autoincrement=True)
    officer_name = Column(Text, nullable=False)
    saved_posts = Column(ARRAY(Integer), default=[])
    saved_clubs = Column(ARRAY(Integer), default=[])
    officer_clubs = Column(ARRAY(Integer), default=[])
    associated_posts = Column(ARRAY(Integer), default=[])


class Club(Base):
    __tablename__ = "club_table"
    club_id = Column(Integer, primary_key=True, autoincrement=True)
    club_profile = Column(Text, nullable=False)
    club_type = Column(Text, nullable=False)
    club_filters = Column(ARRAY(Text), default=[])
    club_officers = Column(ARRAY(Integer), default=[])
    president = Column(Integer, ForeignKey("officer_table.officer_id"))
    vice_president = Column(Integer, ForeignKey("officer_table.officer_id"))
    treasurer = Column(Integer, ForeignKey("officer_table.officer_id"))

_engine = sqlalchemy.create_engine(_database_url)


