from sqlalchemy import Column, Integer, String
from db import Base


class User(Base):
	__tablename__ = "users"
	id = Column(Integer, primary_key=True, index=True)
	email = Column(String, unique=True, index=True, nullable=False)
	hashed_password = Column(String, nullable=False)
	# store a hashed refresh token or token id for logout/rotation (demo)
	refresh_token_hash = Column(String, nullable=True)