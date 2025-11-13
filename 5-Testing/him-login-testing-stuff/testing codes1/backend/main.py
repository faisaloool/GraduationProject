import os
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from db import SessionLocal, engine, Base
from models import User
from jose import JWTError, jwt
from security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    JWT_SECRET,
)

# Create DB
Base.metadata.create_all(bind=engine)


app = FastAPI()


# Allow CORS from local React dev server
origins = ["http://localhost:3000"]
app.add_middleware(
CORSMiddleware,
allow_origins=origins,
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
)

# helpers

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post('/register')
def register(email: str, password: str, db: Session = Depends(get_db)):
  existing = db.query(User).filter(User.email == email).first()
  if existing:
     raise HTTPException(status_code=400, detail='Email already registered')
  user = User(email=email, hashed_password=hash_password(password))
  db.add(user)
  db.commit()
  db.refresh(user)
  return {"msg": "user created", "id": user.id}

@app.post('/login')
def login(response: Response, email: str, password: str, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == email).first()
  if not user or not verify_password(password, user.hashed_password):
    raise HTTPException(status_code=401, detail="Invalid credentials")


  access_token = create_access_token(str(user.id))
  refresh_token = create_refresh_token()
  user.refresh_token_hash = hash_refresh_token(refresh_token)
  db.add(user)
  db.commit()


  # set HTTP-only cookie for refresh token
  response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,
    samesite='lax',
    # secure=True in production
  )


  return {"access_token": access_token, "token_type": "bearer"}

@app.post('/refresh')
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
  rt = request.cookies.get('refresh_token')
  if not rt:
     raise HTTPException(status_code=401, detail='No refresh token')
  hashed = hash_refresh_token(rt)
  user = db.query(User).filter(User.refresh_token_hash == hashed).first()
  if not user:
    raise HTTPException(status_code=401, detail='Invalid refresh token')


  # issue new access token (and optionally rotate refresh token)
  access_token = create_access_token(str(user.id))


  # rotate refresh token
  new_rt = create_refresh_token()
  user.refresh_token_hash = hash_refresh_token(new_rt)
  db.add(user)
  db.commit()
  response.set_cookie('refresh_token', new_rt, httponly=True, samesite='lax')
  return {"access_token": access_token, "token_type": "bearer"}

@app.post('/logout')
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
  rt = request.cookies.get('refresh_token')
  if not rt:
    response.delete_cookie('refresh_token')
    return {"msg": "logged out"}
  hashed = hash_refresh_token(rt)
  user = db.query(User).filter(User.refresh_token_hash == hashed).first()
  if user:
    user.refresh_token_hash = None
    db.add(user)
    db.commit()
  response.delete_cookie('refresh_token')
  return {"msg": "logged out"}

def get_current_user(request: Request):
  auth = request.headers.get('authorization')
  if not auth:
    raise HTTPException(status_code=401, detail='Missing auth')
  scheme, _, token = auth.partition(' ')
  if scheme.lower() != 'bearer' or not token:
    raise HTTPException(status_code=401, detail='Invalid auth header')
  try:
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return payload.get('sub')
  except JWTError:
    raise HTTPException(status_code=401, detail='Token invalid or expired')

@app.get('/protected')
def protected(request: Request):
  user_id = get_current_user(request)
  return {"msg": f"Hello user {user_id}, this is protected data."}




# simple root
@app.get('/')
def root():
  return {"msg": "FastAPI JWT demo running"}
