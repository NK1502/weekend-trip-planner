import hashlib
import hmac
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


SESSION_TTL_SECONDS = 30 * 60
PASSWORD_ITERATIONS = 310_000
DATABASE_PATH = Path(
    os.getenv("AUTH_DATABASE_PATH", str(Path(__file__).resolve().parents[2] / "auth.db"))
)


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def _database():
    connection = _connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_auth_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS auth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
                created_at REAL NOT NULL,
                expires_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
                ON auth_sessions(expires_at);
            """
        )


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )


def _public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def _new_session(connection: sqlite3.Connection, user_id: int) -> tuple[str, float]:
    now = datetime.now(timezone.utc).timestamp()
    expires_at = now + SESSION_TTL_SECONDS
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    connection.execute(
        "INSERT INTO auth_sessions(token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token_hash, user_id, now, expires_at),
    )
    connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now,))
    return token, expires_at


def create_account(name: str, email: str, password: str) -> tuple[dict, str, float]:
    salt = secrets.token_bytes(16)
    password_hash = _hash_password(password, salt)
    try:
        with _database() as connection:
            cursor = connection.execute(
                "INSERT INTO auth_users(name, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (name, email, salt, password_hash, datetime.now(timezone.utc).timestamp()),
            )
            user = connection.execute(
                "SELECT id, name, email FROM auth_users WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            token, expires_at = _new_session(connection, user["id"])
            return _public_user(user), token, expires_at
    except sqlite3.IntegrityError as error:
        if "auth_users.email" in str(error).lower() or "unique" in str(error).lower():
            raise ValueError("An account with this email already exists.") from error
        raise


def authenticate(email: str, password: str) -> tuple[dict, str, float] | None:
    with _database() as connection:
        user = connection.execute(
            "SELECT id, name, email, password_salt, password_hash FROM auth_users WHERE email = ? COLLATE NOCASE",
            (email,),
        ).fetchone()
        if user is None or not hmac.compare_digest(
            _hash_password(password, user["password_salt"]), user["password_hash"]
        ):
            return None
        token, expires_at = _new_session(connection, user["id"])
        return _public_user(user), token, expires_at


def get_session_user(token: str | None) -> tuple[dict, float] | None:
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc).timestamp()
    with _database() as connection:
        connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now,))
        row = connection.execute(
            """SELECT u.id, u.name, u.email, s.expires_at
               FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ?""",
            (token_hash, now),
        ).fetchone()
        if row is None:
            return None
        return _public_user(row), row["expires_at"]


def revoke_session(token: str | None) -> None:
    if not token:
        return
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with _connect() as connection:
        connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (token_hash,))


def serialize_expiry(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
