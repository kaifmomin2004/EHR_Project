#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for EHR System
Tests all authentication, patient, medical record, and user management endpoints
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class EHRAPITester:
    def __init__(self, base_url="https://blockchain-ehr.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.patients = {}  # Store patient data
        self.records = {}   # Store medical record data
        self.tests_run = 0
        self.tests_passed = 0
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}
                
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}
                
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_user_registration(self):
        """Test user registration for different roles"""
        print("\n🔐 Testing User Registration...")
        
        # Test data for different roles
        test_users = [
            {
                "email": f"doctor_{datetime.now().strftime('%H%M%S')}@test.com",
                "password": "TestPass123!",
                "full_name": "Dr. Test Doctor",
                "role": "doctor"
            },
            {
                "email": f"patient_{datetime.now().strftime('%H%M%S')}@test.com", 
                "password": "TestPass123!",
                "full_name": "Test Patient",
                "role": "patient"
            },
            {
                "email": f"admin_{datetime.now().strftime('%H%M%S')}@test.com",
                "password": "TestPass123!",
                "full_name": "Test Admin",
                "role": "admin"
            }
        ]
        
        for user_data in test_users:
            success, response = self.make_request('POST', 'auth/register', user_data, expected_status=200)
            
            if success and 'access_token' in response:
                self.tokens[user_data['role']] = response['access_token']
                self.users[user_data['role']] = response['user']
                self.log_test(f"Register {user_data['role']}", True, f"- Token received")
            else:
                self.log_test(f"Register {user_data['role']}", False, f"- {response}")
                return False
                
        return True

    def test_user_login(self):
        """Test user login functionality"""
        print("\n🔑 Testing User Login...")
        
        # Test login for each registered user
        for role in ['doctor', 'patient', 'admin']:
            if role not in self.users:
                continue
                
            login_data = {
                "email": self.users[role]['email'],
                "password": "TestPass123!"
            }
            
            success, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
            
            if success and 'access_token' in response:
                # Update token (should be same as registration token)
                self.tokens[role] = response['access_token']
                self.log_test(f"Login {role}", True, f"- Token received")
            else:
                self.log_test(f"Login {role}", False, f"- {response}")
                
        # Test invalid login
        invalid_login = {"email": "invalid@test.com", "password": "wrongpass"}
        success, response = self.make_request('POST', 'auth/login', invalid_login, expected_status=401)
        self.log_test("Invalid login rejection", success, f"- Status 401 received")

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        print("\n👤 Testing Auth Me Endpoint...")
        
        for role in ['doctor', 'patient', 'admin']:
            if role not in self.tokens:
                continue
                
            success, response = self.make_request('GET', 'auth/me', token=self.tokens[role])
            
            if success and 'email' in response:
                self.log_test(f"Auth me - {role}", True, f"- User data received")
            else:
                self.log_test(f"Auth me - {role}", False, f"- {response}")
                
        # Test without token
        success, response = self.make_request('GET', 'auth/me', expected_status=401)
        self.log_test("Auth me without token", success, f"- Unauthorized access blocked")

    def test_patient_creation(self):
        """Test patient profile creation"""
        print("\n🏥 Testing Patient Creation...")
        
        patient_data = {
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "phone_number": "+1234567890",
            "address": "123 Test Street, Test City",
            "emergency_contact_name": "Emergency Contact",
            "emergency_contact_phone": "+0987654321",
            "blood_type": "O+",
            "allergies": ["Penicillin"],
            "chronic_conditions": ["Hypertension"],
            "current_medications": ["Lisinopril"]
        }
        
        # Test patient creating their own profile
        if 'patient' in self.tokens:
            success, response = self.make_request('POST', 'patients', patient_data, 
                                                token=self.tokens['patient'], expected_status=200)
            if success and 'id' in response:
                self.patients['patient_profile'] = response
                self.log_test("Patient creates own profile", True, f"- Patient ID: {response['id']}")
            else:
                self.log_test("Patient creates own profile", False, f"- {response}")
                
        # Test doctor creating patient profile
        if 'doctor' in self.tokens:
            success, response = self.make_request('POST', 'patients', patient_data,
                                                token=self.tokens['doctor'], expected_status=200)
            if success and 'id' in response:
                self.patients['doctor_created'] = response
                self.log_test("Doctor creates patient profile", True, f"- Patient ID: {response['id']}")
            else:
                self.log_test("Doctor creates patient profile", False, f"- {response}")

    def test_patient_access_control(self):
        """Test role-based access control for patients"""
        print("\n🔒 Testing Patient Access Control...")
        
        # Test doctor/admin can view all patients
        for role in ['doctor', 'admin']:
            if role not in self.tokens:
                continue
                
            success, response = self.make_request('GET', 'patients', token=self.tokens[role])
            if success and isinstance(response, list):
                self.log_test(f"{role} views all patients", True, f"- Found {len(response)} patients")
            else:
                self.log_test(f"{role} views all patients", False, f"- {response}")
                
        # Test patient can only view own profile via /patients/me
        if 'patient' in self.tokens:
            success, response = self.make_request('GET', 'patients/me', token=self.tokens['patient'])
            if success and 'id' in response:
                self.log_test("Patient views own profile", True, f"- Profile retrieved")
            else:
                self.log_test("Patient views own profile", False, f"- {response}")
                
            # Test patient cannot view all patients
            success, response = self.make_request('GET', 'patients', token=self.tokens['patient'], expected_status=403)
            self.log_test("Patient blocked from all patients", success, f"- Access denied")

    def test_medical_records(self):
        """Test medical record creation and access"""
        print("\n📋 Testing Medical Records...")
        
        # Get a patient ID for testing
        patient_id = None
        if 'patient_profile' in self.patients:
            patient_id = self.patients['patient_profile']['id']
        elif 'doctor_created' in self.patients:
            patient_id = self.patients['doctor_created']['id']
            
        if not patient_id:
            self.log_test("Medical records test", False, "- No patient ID available")
            return
            
        record_data = {
            "patient_id": patient_id,
            "chief_complaint": "Chest pain",
            "diagnosis": "Angina pectoris",
            "treatment_plan": "Medication and lifestyle changes",
            "prescriptions": ["Nitroglycerin", "Aspirin"],
            "notes": "Patient reports improvement with medication",
            "follow_up_date": "2024-09-01"
        }
        
        # Test doctor creating medical record
        if 'doctor' in self.tokens:
            success, response = self.make_request('POST', 'medical-records', record_data,
                                                token=self.tokens['doctor'], expected_status=200)
            if success and 'id' in response:
                self.records['test_record'] = response
                self.log_test("Doctor creates medical record", True, f"- Record ID: {response['id']}")
            else:
                self.log_test("Doctor creates medical record", False, f"- {response}")
                
        # Test patient cannot create medical record
        if 'patient' in self.tokens:
            success, response = self.make_request('POST', 'medical-records', record_data,
                                                token=self.tokens['patient'], expected_status=403)
            self.log_test("Patient blocked from creating record", success, f"- Access denied")
            
        # Test viewing medical records
        for role in ['doctor', 'patient', 'admin']:
            if role not in self.tokens:
                continue
                
            success, response = self.make_request('GET', 'medical-records', token=self.tokens[role])
            if success and isinstance(response, list):
                self.log_test(f"{role} views medical records", True, f"- Found {len(response)} records")
            else:
                self.log_test(f"{role} views medical records", False, f"- {response}")

    def test_users_endpoint(self):
        """Test users management endpoint"""
        print("\n👥 Testing Users Management...")
        
        # Test doctor/admin can view users
        for role in ['doctor', 'admin']:
            if role not in self.tokens:
                continue
                
            success, response = self.make_request('GET', 'users', token=self.tokens[role])
            if success and isinstance(response, list):
                self.log_test(f"{role} views users", True, f"- Found {len(response)} users")
            else:
                self.log_test(f"{role} views users", False, f"- {response}")
                
        # Test patient cannot view users
        if 'patient' in self.tokens:
            success, response = self.make_request('GET', 'users', token=self.tokens['patient'], expected_status=403)
            self.log_test("Patient blocked from users", success, f"- Access denied")

    def test_error_handling(self):
        """Test API error handling"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test invalid endpoints
        success, response = self.make_request('GET', 'invalid-endpoint', expected_status=404)
        self.log_test("Invalid endpoint returns 404", success, f"- Not found error")
        
        # Test malformed data
        if 'doctor' in self.tokens:
            invalid_patient = {"invalid": "data"}
            success, response = self.make_request('POST', 'patients', invalid_patient,
                                                token=self.tokens['doctor'], expected_status=422)
            self.log_test("Malformed data rejected", success, f"- Validation error")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting EHR System Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        if not self.test_user_registration():
            print("❌ Registration failed - stopping tests")
            return False
            
        self.test_user_login()
        self.test_auth_me()
        self.test_patient_creation()
        self.test_patient_access_control()
        self.test_medical_records()
        self.test_users_endpoint()
        self.test_error_handling()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️ {failed} tests failed. Backend needs attention.")
            return False

def main():
    """Main test execution"""
    tester = EHRAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())