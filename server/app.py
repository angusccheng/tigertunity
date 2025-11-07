# server/app.py
import os, json, secrets, urllib.parse, requests
from flask import Flask, redirect, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from sqlalchemy import text
from database import SessionLocal, init_db
import psycopg2, psycopg2.extras

DATABASE_URL = os.getenv("NEON_URL")  # or whichever you’re using

CAS_BASE = "https://fed.princeton.edu/cas"
CAS_VALIDATE = f"{CAS_BASE}/p3/serviceValidate"   # JSON capable
APP_SECRET = os.getenv("APP_SECRET_KEY", "dev-secret")        # set in .env
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL  = os.getenv("BACKEND_URL",  "http://localhost:5000")

app = Flask(__name__)
app.config.update(
    SECRET_KEY=APP_SECRET,
    JWT_SECRET_KEY=APP_SECRET,
    JWT_TOKEN_LOCATION=["headers"],
    JWT_ACCESS_TOKEN_EXPIRES=3600,      # 1h
    JWT_REFRESH_TOKEN_EXPIRES=86400,    # 1d
)
CORS(app,
     supports_credentials=True,
     resources={r"/*": {"origins": FRONTEND_URL}},
     expose_headers=["Authorization"],
     allow_headers=["Content-Type", "Authorization"])
jwt = JWTManager(app)
init_db()
db = SessionLocal()

def service_url():
    # CAS will send users back here with ?ticket=
    return f"{BACKEND_URL}/login"

def validate_ticket(ticket: str):
    params = {
        "service": service_url(),
        "ticket": ticket,
        "format": "json",
    }
    r = requests.get(CAS_VALIDATE, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    return data.get("serviceResponse", {}).get("authenticationSuccess")

@app.get("/login")
def login():
    ticket = request.args.get("ticket")
    # Step 1: no ticket yet => send user to CAS
    if not ticket:
        target = f"{CAS_BASE}/login?service=" + urllib.parse.quote(service_url(), safe="")
        return redirect(target, code=302)

    # Step 2: validate ticket with CAS
    ok = validate_ticket(ticket)
    if not ok:
        return "CAS validation failed", 401

    username = ok.get("user")
    userinfo = json.dumps(ok)  # store full blob for demo

    # Upsert userinfo
    db.execute(text("""
      INSERT INTO userinfos(username, userinfo) VALUES (:u,:i)
      ON CONFLICT(username) DO UPDATE SET userinfo=:i
    """), {"u": username, "i": userinfo})

    # Create one-time nonce
    nonce = secrets.token_urlsafe(24)
    db.execute(text("INSERT INTO nonces(nonce, username) VALUES (:n,:u)"), {"n": nonce, "u": username})
    db.commit()

    # Step 3: bounce back to frontend with ?nonce=
    original = request.args.get("originalurl", "/")
    sep = "&" if "?" in original else "?"
    return redirect(f"{FRONTEND_URL}{original}{sep}nonce={nonce}", code=302)

@app.get("/api/gettokens")
def get_tokens():
    nonce = request.args.get("nonce")
    if not nonce:
        return jsonify({"error": "missing nonce"}), 400

    row = db.execute(text("SELECT username FROM nonces WHERE nonce=:n"), {"n": nonce}).first()
    if not row:
        return jsonify({"error": "invalid nonce"}), 400

    # consume nonce (one-time)
    db.execute(text("DELETE FROM nonces WHERE nonce=:n"), {"n": nonce})
    db.commit()

    username = row[0]
    access = create_access_token(identity=username)
    refresh = create_refresh_token(identity=username)
    return jsonify({"username": username, "access": access, "refresh": refresh})

@app.post("/api/refreshaccesstoken")
@jwt_required(refresh=True)
def refresh_access():
    username = get_jwt_identity()
    return jsonify({"access": create_access_token(identity=username)})

@app.get("/api/me")
@jwt_required()
def me():
    username = get_jwt_identity()
    row = db.execute(text("SELECT userinfo FROM userinfos WHERE username=:u"), {"u": username}).first()
    return jsonify({"username": username, "userinfo": json.loads(row[0]) if row else None})

@app.get("/logoutapp")
def logout_app():
    # Frontend will simply clear tokens; this just helps route there.
    return redirect(f"{FRONTEND_URL}/logout", code=302)

@app.get("/logoutcas")
def logout_cas():
    # CAS global logout, then come back to app logout to clear tokens
    target = urllib.parse.quote(f"{BACKEND_URL}/logoutapp", safe="")
    return redirect(f"{CAS_BASE}/logout?service={target}", code=302)

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    return conn


@app.route("/api/posts", methods=["GET"])
def list_posts():
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM post_table ORDER BY timestamp DESC LIMIT 5")
                entries = cur.fetchall()
        return jsonify(entries)
    except Exception as e:
        return jsonify({"error": str(e)})


@app.route("/api/posts", methods=["POST"])
@jwt_required() 
def create_post():
    try:
        username = get_jwt_identity()  # Princeton NetID of the user
        if not username:
            return jsonify({"error": "Unauthorized user"}), 403

        data = request.get_json()
        post_title = data.get("post_title")
        club_name = data.get("club_name")
        officer_name = data.get("officer_name")
        post_content = data.get("post_content")
        post_type = data.get("post_type")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO post_table
                    (post_title, club_name, officer_name, post_content, post_type)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING post_id, post_title, club_name, officer_name, post_content, timestamp, post_type
                    """,
                    (post_title, club_name, officer_name, post_content, post_type),
                )
                new_entry = cur.fetchone()
                conn.commit()

        keys = [
            "post_id", "post_title", "club_name",
            "officer_name", "post_content", "timestamp", "post_type"
        ]
        return jsonify({
            "message": "Post created successfully",
            "entry": dict(zip(keys, new_entry)),
            "created_by": username
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM post_table WHERE post_id = %s", (post_id,))
                conn.commit()
        return jsonify({"message": "Post deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
