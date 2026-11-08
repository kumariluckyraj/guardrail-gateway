from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt limit is 72 bytes


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserOut(BaseModel):
    id: str
    org_id: str
    company_name: str
    email: EmailStr