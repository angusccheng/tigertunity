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
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": FRONTEND_URL}})
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

if __name__ == "__main__":
    app.run(port=5000, debug=True)
