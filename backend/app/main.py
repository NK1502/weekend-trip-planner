import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.auth import AuthSessionResponse, LoginRequest, SignUpRequest
from app.services.auth_service import (
    SESSION_TTL_SECONDS,
    authenticate,
    create_account,
    get_session_user,
    initialize_auth_database,
    revoke_session,
    serialize_expiry,
)
from app.schemas.trip_request import TripRequest
from app.agents.requirement_agent import analyze_requirements
from app.agents.destination_agent import find_destinations
from app.agents.ranking_agent import rank_destinations
from app.agents.weather_agent import analyze_weather
from app.agents.cost_agent import analyze_cost
from app.agents.trip_manager import create_itinerary


AUTH_COOKIE_NAME = "weekend_escapes_session"
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_auth_database()
    yield


app = FastAPI(title="Weekend Trip Planner", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _start_session(response: Response, user: dict, token: str, expires_at: float) -> dict:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {
        "user": user,
        "expires_at": serialize_expiry(expires_at),
        "expires_in": max(0, int(expires_at - datetime.now(timezone.utc).timestamp())),
    }


@app.post("/auth/signup", response_model=AuthSessionResponse, status_code=201)
def sign_up(payload: SignUpRequest, response: Response):
    try:
        user, token, expires_at = create_account(payload.name, payload.email, payload.password)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return _start_session(response, user, token, expires_at)


@app.post("/auth/login", response_model=AuthSessionResponse)
def log_in(payload: LoginRequest, response: Response):
    session = authenticate(payload.email, payload.password)
    if session is None:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    user, token, expires_at = session
    return _start_session(response, user, token, expires_at)


@app.get("/auth/me", response_model=AuthSessionResponse)
def current_user(request: Request, response: Response):
    session = get_session_user(request.cookies.get(AUTH_COOKIE_NAME))
    if session is None:
        response.delete_cookie(AUTH_COOKIE_NAME, path="/", samesite="lax")
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    user, expires_at = session
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=request.cookies[AUTH_COOKIE_NAME],
        max_age=max(0, int(expires_at - datetime.now(timezone.utc).timestamp())),
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {
        "user": user,
        "expires_at": serialize_expiry(expires_at),
        "expires_in": max(0, int(expires_at - datetime.now(timezone.utc).timestamp())),
    }


@app.post("/auth/logout")
def log_out(request: Request, response: Response):
    revoke_session(request.cookies.get(AUTH_COOKIE_NAME))
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
    )
    return {"message": "Signed out successfully."}

@app.get("/")
def home():
    return {
        "message": "Weekend Trip Planner API is running!"
    }


@app.post("/plan-trip")
def plan_trip(trip: TripRequest):

    profile = analyze_requirements(trip)

    if "error" in profile:
        return profile

    destinations = find_destinations(profile)

    if not destinations:
        return {
            "message": "No destinations found matching your requirements",
            "profile": profile,
            "destinations": []
        }

    destinations = rank_destinations(destinations, profile)

    destinations = analyze_weather(destinations, profile)

    destinations = analyze_cost(destinations, profile)

    itinerary = create_itinerary(destinations, profile)

    return {
        "message": "Trip recommendations ready",
        "profile": profile,
        "destinations": destinations,
        "itinerary": itinerary
    }
