from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: EmailStr
    full_name: str | None = None
    role: str
    is_active: bool
    force_password_change: bool = False


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = Field(...)
    full_name: str | None = None


class UpdateUserRequest(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)
