from app import get_db_connection

def put_nonce(nonce, netid):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO nonces (nonce, netid) VALUES (%s, %s)", 
                       (nonce, netid))
            conn.commit()

def get_nonce(nonce):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT netid FROM nonces WHERE nonce = %s", (nonce,))
            result = cur.fetchone()
            return result[0] if result else None

def delete_nonce(nonce):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM nonces WHERE nonce = %s", (nonce,))
            conn.commit()

def put_userinfo(netid, info):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO userinfo (netid, info) 
                VALUES (%s, %s)
                ON CONFLICT (netid) 
                DO UPDATE SET info = EXCLUDED.info
            """, (netid, info))
            conn.commit()

def get_userinfo(netid):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT info FROM userinfo WHERE netid = %s", (netid,))
            result = cur.fetchone()
            return result[0] if result else None