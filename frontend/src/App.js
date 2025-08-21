import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Heart, Users, FileText, User, LogOut, Plus, Search, Calendar, Shield } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (email, password, fullName, role) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        password,
        full_name: fullName,
        role,
      });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Heart className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Header Component
const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">HealthChain EHR</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={user.role === 'doctor' ? 'default' : user.role === 'admin' ? 'destructive' : 'secondary'}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
            <span className="text-sm text-gray-700">{user.full_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Auth Page
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'patient',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isLogin
      ? await login(formData.email, formData.password)
      : await register(formData.email, formData.password, formData.fullName, formData.role);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Heart className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">HealthChain EHR</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



// Patient Profile Component
const PatientProfile = () => {
  const { user } = useAuth();
  const [patientData, setPatientData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    date_of_birth: '',
    gender: 'male',
    phone_number: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_type: '',
    allergies: [],
    chronic_conditions: [],
    current_medications: []
  });

  useEffect(() => {
    fetchPatientProfile();
  }, []);

  const fetchPatientProfile = async () => {
    try {
      const response = await axios.get(`${API}/patients/me`);
      setPatientData(response.data);
      setFormData(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setIsEditing(true); // No profile exists, show creation form
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/patients`, formData);
      setPatientData(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save patient profile:', error);
    }
  };

  const handleArrayChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData({ ...formData, [field]: items });
  };

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto py-6 px-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {patientData ? 'Edit Patient Profile' : 'Create Patient Profile'}
              </CardTitle>
              <CardDescription>
                Please provide your medical information to complete your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_type">Blood Type</Label>
                    <Input
                      id="blood_type"
                      value={formData.blood_type}
                      onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                      placeholder="e.g., O+, A-, AB+"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                  <Input
                    id="allergies"
                    value={formData.allergies.join(', ')}
                    onChange={(e) => handleArrayChange('allergies', e.target.value)}
                    placeholder="e.g., Penicillin, Peanuts, Latex"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chronic_conditions">Chronic Conditions (comma-separated)</Label>
                  <Input
                    id="chronic_conditions"
                    value={formData.chronic_conditions.join(', ')}
                    onChange={(e) => handleArrayChange('chronic_conditions', e.target.value)}
                    placeholder="e.g., Diabetes, Hypertension"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_medications">Current Medications (comma-separated)</Label>
                  <Input
                    id="current_medications"
                    value={formData.current_medications.join(', ')}
                    onChange={(e) => handleArrayChange('current_medications', e.target.value)}
                    placeholder="e.g., Metformin, Lisinopril"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="flex-1">
                    {patientData ? 'Update Profile' : 'Create Profile'}
                  </Button>
                  {patientData && (
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p>Loading patient profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Profile</h1>
            <p className="text-gray-600 mt-1">Your medical information and health records</p>
          </div>
          <Button onClick={() => setIsEditing(true)}>
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="patient-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-600" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><span className="font-medium">Date of Birth:</span> {patientData.date_of_birth}</div>
              <div><span className="font-medium">Gender:</span> {patientData.gender}</div>
              <div><span className="font-medium">Phone:</span> {patientData.phone_number}</div>
              <div><span className="font-medium">Blood Type:</span> {patientData.blood_type || 'Not specified'}</div>
              <div><span className="font-medium">Address:</span> {patientData.address}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span>Emergency Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><span className="font-medium">Name:</span> {patientData.emergency_contact_name}</div>
              <div><span className="font-medium">Phone:</span> {patientData.emergency_contact_phone}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span>Medical Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium text-red-600">Allergies:</span>
                <div className="mt-1">
                  {patientData.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patientData.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">{allergy}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">None reported</span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-medium text-orange-600">Chronic Conditions:</span>
                <div className="mt-1">
                  {patientData.chronic_conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patientData.chronic_conditions.map((condition, index) => (
                        <Badge key={index} variant="secondary">{condition}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">None reported</span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-medium text-blue-600">Current Medications:</span>
                <div className="mt-1">
                  {patientData.current_medications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patientData.current_medications.map((medication, index) => (
                        <Badge key={index}>{medication}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">None reported</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Medical Records Component
const MedicalRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
    prescriptions: [],
    notes: '',
    follow_up_date: ''
  });

  useEffect(() => {
    fetchRecords();
    if (user.role === 'doctor' || user.role === 'admin') {
      fetchPatients();
    }
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API}/medical-records`);
      setRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch medical records:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/medical-records`, formData);
      setIsCreating(false);
      setFormData({
        patient_id: '',
        chief_complaint: '',
        diagnosis: '',
        treatment_plan: '',
        prescriptions: [],
        notes: '',
        follow_up_date: ''
      });
      fetchRecords();
    } catch (error) {
      console.error('Failed to create medical record:', error);
    }
  };

  const handleArrayChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData({ ...formData, [field]: items });
  };

  if (isCreating && (user.role === 'doctor' || user.role === 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto py-6 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Medical Record</CardTitle>
              <CardDescription>Add a new medical record for a patient.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Patient</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => setFormData({ ...formData, patient_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.user_id} - Born: {patient.date_of_birth}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chief_complaint">Chief Complaint</Label>
                  <Input
                    id="chief_complaint"
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    placeholder="Patient's main concern"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Input
                    id="diagnosis"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="Medical diagnosis"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatment_plan">Treatment Plan</Label>
                  <Textarea
                    id="treatment_plan"
                    value={formData.treatment_plan}
                    onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                    placeholder="Recommended treatment approach"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prescriptions">Prescriptions (comma-separated)</Label>
                  <Input
                    id="prescriptions"
                    value={formData.prescriptions.join(', ')}
                    onChange={(e) => handleArrayChange('prescriptions', e.target.value)}
                    placeholder="e.g., Amoxicillin 500mg, Ibuprofen 200mg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional observations or notes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow_up_date">Follow-up Date</Label>
                  <Input
                    id="follow_up_date"
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" className="flex-1">Create Record</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600 mt-1">
              {user.role === 'patient' 
                ? 'Your medical history and health records' 
                : 'Patient medical records and health information'
              }
            </p>
          </div>
          {(user.role === 'doctor' || user.role === 'admin') && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Record
            </Button>
          )}
        </div>

        {records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No medical records found</h3>
              <p className="text-gray-600">
                {user.role === 'patient' 
                  ? 'Your medical records will appear here once created by a healthcare provider.'
                  : 'Create the first medical record to get started.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <Card key={record.id} className="medical-record-card">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{record.diagnosis}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(record.visit_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge>{record.chief_complaint}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Treatment Plan</h4>
                      <p className="text-gray-700 text-sm">{record.treatment_plan}</p>
                    </div>
                    {record.prescriptions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Prescriptions</h4>
                        <div className="flex flex-wrap gap-1">
                          {record.prescriptions.map((prescription, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {prescription}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {record.notes && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-gray-700 text-sm">{record.notes}</p>
                    </div>
                  )}
                  
                  {record.follow_up_date && (
                    <div className="text-sm text-blue-600">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Follow-up: {new Date(record.follow_up_date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Patients Management Component (for doctors/admins)
const PatientsManagement = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchPatients();
    fetchUsers();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
  };

  if (user.role !== 'doctor' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-600 mt-1">View and manage patient profiles and information</p>
        </div>

        {patients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-600">Patients will appear here once they create their profiles.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => {
              const patientUser = getUserById(patient.user_id);
              return (
                <Card key={patient.id} className="patient-card card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-full">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {patientUser?.full_name || 'Unknown Patient'}
                        </h3>
                        <p className="text-sm text-gray-600">{patient.gender} • Born: {patient.date_of_birth}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Phone:</span> {patient.phone_number}</div>
                      <div><span className="font-medium">Blood Type:</span> {patient.blood_type || 'Not specified'}</div>
                      <div><span className="font-medium">Emergency Contact:</span> {patient.emergency_contact_name}</div>
                    </div>
                    
                    {(patient.allergies.length > 0 || patient.chronic_conditions.length > 0) && (
                      <div className="mt-4 pt-4 border-t">
                        {patient.allergies.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-red-600">Allergies:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {patient.allergies.map((allergy, index) => (
                                <Badge key={index} variant="destructive" className="text-xs">
                                  {allergy}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {patient.chronic_conditions.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-orange-600">Conditions:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {patient.chronic_conditions.map((condition, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Updated Dashboard with navigation
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: 0, records: 0, users: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      if (user.role === 'doctor' || user.role === 'admin') {
        const [patientsRes, recordsRes, usersRes] = await Promise.all([
          axios.get(`${API}/patients`),
          axios.get(`${API}/medical-records`),
          axios.get(`${API}/users`),
        ]);
        setStats({
          patients: patientsRes.data.length,
          records: recordsRes.data.length,
          users: usersRes.data.length,
        });
      } else {
        const recordsRes = await axios.get(`${API}/medical-records`);
        setStats({
          patients: 1,
          records: recordsRes.data.length,
          users: 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'create-record':
        navigate('/medical-records');
        break;
      case 'search-patients':
        navigate('/patients');
        break;
      case 'update-profile':
        navigate('/profile');
        break;
      case 'view-records':
        navigate('/medical-records');
        break;
      case 'manage-users':
        navigate('/patients');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.full_name}!
          </h1>
          <p className="text-gray-600">
            {user.role === 'doctor' && 'Manage your patients and medical records'}
            {user.role === 'patient' && 'View your medical information and health records'}
            {user.role === 'admin' && 'Oversee the entire healthcare system'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white card-hover" 
                onClick={() => user.role === 'patient' ? navigate('/profile') : navigate('/patients')}>
            <CardContent className="p-6 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">
                    {user.role === 'patient' ? 'My Profile' : 'Total Patients'}
                  </p>
                  <p className="text-3xl font-bold">{stats.patients}</p>
                </div>
                <Users className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white card-hover"
                onClick={() => navigate('/medical-records')}>
            <CardContent className="p-6 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Medical Records</p>
                  <p className="text-3xl font-bold">{stats.records}</p>
                </div>
                <FileText className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">
                    {user.role === 'patient' ? 'My Account' : 'System Users'}
                  </p>
                  <p className="text-3xl font-bold">{stats.users}</p>
                </div>
                <User className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user.role === 'doctor' && (
                  <>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost" 
                      onClick={() => handleQuickAction('create-record')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Medical Record
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost"
                      onClick={() => handleQuickAction('search-patients')}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      View All Patients
                    </Button>
                  </>
                )}
                {user.role === 'patient' && (
                  <>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost"
                      onClick={() => handleQuickAction('update-profile')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Update Profile
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost"
                      onClick={() => handleQuickAction('view-records')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Medical Records
                    </Button>
                  </>
                )}
                {user.role === 'admin' && (
                  <>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost"
                      onClick={() => handleQuickAction('manage-users')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Patients
                    </Button>
                    <Button 
                      className="w-full justify-start" 
                      variant="ghost"
                      onClick={() => handleQuickAction('create-record')}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Medical Records
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p>Welcome to HealthChain EHR System!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Your account is active and secure.</p>
                  <p className="text-xs text-gray-500 mt-1">System status: All services operational</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">Full access to your features</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-records"
            element={
              <ProtectedRoute>
                <MedicalRecords />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <PatientsManagement />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;