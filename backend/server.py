from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from passlib.hash import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Blockchain EHR System", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Reference to User
    date_of_birth: str
    gender: Gender
    phone_number: str
    address: str
    emergency_contact_name: str
    emergency_contact_phone: str
    blood_type: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    current_medications: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PatientCreate(BaseModel):
    date_of_birth: str
    gender: Gender
    phone_number: str
    address: str
    emergency_contact_name: str
    emergency_contact_phone: str
    blood_type: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    current_medications: List[str] = []

class MedicalRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    visit_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    chief_complaint: str
    diagnosis: str
    treatment_plan: str
    prescriptions: List[str] = []
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MedicalRecordCreate(BaseModel):
    patient_id: str
    chief_complaint: str
    diagnosis: str
    treatment_plan: str
    prescriptions: List[str] = []
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None

class MedicalDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    document_name: str
    document_type: str  # X-ray, Lab Report, etc.
    file_path: str
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode = {"user_id": user_id, "role": role, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return bcrypt.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    # Store user with hashed password
    user_dict = user.dict()
    user_dict["password_hash"] = hashed_password
    await db.users.insert_one(user_dict)
    
    # Generate token
    access_token = create_access_token(user.id, user.role.value)
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    access_token = create_access_token(user.id, user.role.value)
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user["user_id"]})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**{k: v for k, v in user_doc.items() if k != "password_hash"})

# Patient Routes
@api_router.post("/patients", response_model=Patient)
async def create_patient_profile(patient_data: PatientCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["patient", "doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    patient = Patient(user_id=current_user["user_id"], **patient_data.dict())
    await db.patients.insert_one(patient.dict())
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors and admins can view all patients")
    
    patients = await db.patients.find().to_list(length=None)
    return [Patient(**patient) for patient in patients]

@api_router.get("/patients/me", response_model=Patient)
async def get_my_patient_profile(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can access this endpoint")
    
    patient_doc = await db.patients.find_one({"user_id": current_user["user_id"]})
    if not patient_doc:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return Patient(**patient_doc)

@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient_by_id(patient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["doctor", "admin"]:
        # Patients can only access their own profile
        if current_user["role"] == "patient":
            patient_doc = await db.patients.find_one({"id": patient_id, "user_id": current_user["user_id"]})
        else:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        patient_doc = await db.patients.find_one({"id": patient_id})
    
    if not patient_doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return Patient(**patient_doc)

# Medical Records Routes
@api_router.post("/medical-records", response_model=MedicalRecord)
async def create_medical_record(record_data: MedicalRecordCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors can create medical records")
    
    record = MedicalRecord(doctor_id=current_user["user_id"], **record_data.dict())
    await db.medical_records.insert_one(record.dict())
    return record

@api_router.get("/medical-records", response_model=List[MedicalRecord])
async def get_medical_records(patient_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    if current_user["role"] == "patient":
        # Patients can only see their own records
        patient_doc = await db.patients.find_one({"user_id": current_user["user_id"]})
        if not patient_doc:
            return []
        query["patient_id"] = patient_doc["id"]
    elif current_user["role"] in ["doctor", "admin"] and patient_id:
        query["patient_id"] = patient_id
    
    records = await db.medical_records.find(query).to_list(length=None)
    return [MedicalRecord(**record) for record in records]

@api_router.get("/medical-records/{record_id}", response_model=MedicalRecord)
async def get_medical_record(record_id: str, current_user: dict = Depends(get_current_user)):
    record_doc = await db.medical_records.find_one({"id": record_id})
    if not record_doc:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    # Check permissions
    if current_user["role"] == "patient":
        patient_doc = await db.patients.find_one({"user_id": current_user["user_id"]})
        if not patient_doc or record_doc["patient_id"] != patient_doc["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this record")
    
    return MedicalRecord(**record_doc)

# Users management for doctors/admins
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors and admins can view users")
    
    users = await db.users.find().to_list(length=None)
    return [User(**{k: v for k, v in user.items() if k != "password_hash"}) for user in users]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()