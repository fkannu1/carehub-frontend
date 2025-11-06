// src/pages/Dashboard.tsx - Smart router with role-specific dashboards
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type Me = { id: string; username: string; role: "PATIENT" | "PHYSICIAN" | string };

interface PatientProfile {
  public_id: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  full_name: string;
  date_of_birth: string | null;
  phone: string;
  address: string;
  height_cm: string | null;
  weight_kg: string | null;
  physician: number | null;
  physician_name: string | null;
}

interface PhysicianProfile {
  public_id: string;
  user: {
    id: string;
    username: string;
  };
  full_name: string;
  specialization: string;
  clinic_name: string;
  connect_code: string;
}

interface PatientInfo {
  id: string;
  public_id: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  height_cm: string | null;
  weight_kg: string | null;
}

interface UpcomingAppointment {
  date_str: string;
  time_str: string;
  peer_name: string;
  status: string;
}

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Physician state
  const [physicianProfile, setPhysicianProfile] = useState<PhysicianProfile | null>(null);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Patient state
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);

  // Shared state
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const meRes = await api.get("/auth/me/");
      const user = meRes.data?.user ?? null;
      setMe(user);

      if (user?.role === "PHYSICIAN") {
        await loadPhysicianData();
      } else if (user?.role === "PATIENT") {
        await loadPatientData();
      }

      // Load appointments for both
      try {
        const appointmentsRes = await api.get("/appointments/mine/");
        const appointments = appointmentsRes.data.results || appointmentsRes.data || [];
        setUpcomingAppointments(appointments.slice(0, 5));
      } catch (error) {
        console.error("Failed to load appointments:", error);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhysicianData = async () => {
    try {
      // Load physician profile
      const profileRes = await api.get("/physician-profiles/");
      const profiles = profileRes.data.results || profileRes.data;
      if (Array.isArray(profiles) && profiles.length > 0) {
        setPhysicianProfile(profiles[0]);
      }

      // Load patients
      const patientsRes = await api.get("/patient-profiles/");
      const patientsList = patientsRes.data.results || patientsRes.data;
      setPatients(Array.isArray(patientsList) ? patientsList : []);
    } catch (error) {
      console.error("Failed to load physician data:", error);
    }
  };

  const loadPatientData = async () => {
    try {
      // ✅ USE THE /me/ ENDPOINT
      const profileRes = await api.get("/patient-profiles/me/");
      const profile = profileRes.data;
      
      if (profile) {
        setPatientProfile(profile);
        console.log("Patient profile loaded:", profile);
      }
    } catch (error) {
      console.error("Failed to load patient data:", error);
      // ✅ Better error handling
      if ((error as any)?.response?.status === 401) {
        console.error("Not authenticated - redirecting to login");
        window.location.href = '/login';
      }
    }
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(query) ||
      p.user?.username?.toLowerCase().includes(query) ||
      p.phone?.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  // ============================================
  // PHYSICIAN DASHBOARD
  // ============================================
  if (me?.role === "PHYSICIAN") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, Dr. {physicianProfile?.full_name || me.username}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/calendar"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Open Calendar
            </Link>
            <Link
              to="/appointments"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              My Appointments
            </Link>
          </div>
        </div>

        {/* Profile Card */}
        {physicianProfile && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Full Name:</span>
                <p className="font-medium">{physicianProfile.full_name || "Not set"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Specialization:</span>
                <p className="font-medium">{physicianProfile.specialization || "Not set"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Clinic:</span>
                <p className="font-medium">{physicianProfile.clinic_name || "Not set"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Connect Code:</span>
                <p className="font-mono font-bold text-lg text-blue-600">
                  {physicianProfile.connect_code}
                </p>
                <p className="text-xs text-gray-500">Share this code with patients</p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
            <div className="space-y-3">
              {upcomingAppointments.map((appt, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{appt.peer_name}</p>
                    <p className="text-sm text-gray-600">
                      {appt.date_str} • {appt.time_str}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
            <Link
              to="/appointments"
              className="mt-4 inline-block text-blue-600 hover:underline text-sm"
            >
              View all appointments →
            </Link>
          </div>
        )}

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">My Patients ({patients.length})</h2>
            </div>
            <input
              type="text"
              placeholder="Search patients by name, username, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-x-auto">
            {filteredPatients.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {searchQuery ? "No patients found matching your search." : "No patients linked yet."}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Patient Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vitals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {patient.full_name || patient.user?.username}
                          </div>
                          <div className="text-sm text-gray-500">@{patient.user?.username}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateAge(patient.date_of_birth)} years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.phone || "No phone"}</div>
                        <div className="text-sm text-gray-500">{patient.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.height_cm && patient.weight_kg ? (
                          <div>
                            <div>{patient.height_cm} cm</div>
                            <div>{patient.weight_kg} kg</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not recorded</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <Link
                          to={`/messages?peer=${patient.user.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          Message
                        </Link>
                        <Link
                          to={`/calendar`}
                          className="text-indigo-600 hover:underline"
                        >
                          Schedule
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PATIENT DASHBOARD
  // ============================================
  if (me?.role === "PATIENT") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {patientProfile?.full_name || me.username}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/calendar"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Book Appointment
            </Link>
            <Link
              to="/appointments"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              My Appointments
            </Link>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Your Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Full Name:</span>
                <p className="font-medium">{patientProfile?.full_name || "Not set"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Age:</span>
                <p className="font-medium">
                  {patientProfile?.date_of_birth 
                    ? `${calculateAge(patientProfile.date_of_birth)} years` 
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Phone:</span>
                <p className="font-medium">{patientProfile?.phone || "Not set"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Address:</span>
                <p className="font-medium">{patientProfile?.address || "Not set"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-gray-600">Height:</span>
                  <p className="font-medium">
                    {patientProfile?.height_cm ? `${patientProfile.height_cm} cm` : "Not set"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Weight:</span>
                  <p className="font-medium">
                    {patientProfile?.weight_kg ? `${patientProfile.weight_kg} kg` : "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Physician Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Your Physician</h2>
            {patientProfile?.physician && patientProfile?.physician_name ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium text-lg">{patientProfile.physician_name}</p>
                </div>
                <div className="pt-3 flex gap-3">
                  <Link
                    to={`/messages?peer=${patientProfile.physician}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                  >
                    Message Doctor
                  </Link>
                  <Link
                    to="/calendar"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                  >
                    Book Appointment
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <p className="text-gray-500 mb-4">You haven't linked to a physician yet</p>
                <p className="text-sm text-gray-600 mb-4">
                  Ask your physician for their connect code
                </p>
                <Link
                  to="/profile/edit"
                  className="inline-block text-blue-600 hover:text-blue-700 font-medium"
                >
                  Link to Physician →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
            <div className="space-y-3">
              {upcomingAppointments.map((appt, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{appt.peer_name}</p>
                    <p className="text-sm text-gray-600">
                      {appt.date_str} • {appt.time_str}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      {appt.status}
                    </span>
                    {patientProfile?.physician && (
                      <Link
                        to={`/messages?peer=${patientProfile.physician}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Chat
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/appointments"
              className="mt-4 inline-block text-blue-600 hover:underline text-sm"
            >
              View all appointments →
            </Link>
          </div>
        )}

        {/* Health Records Preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Health Records</h2>
            <Link to="/records" className="text-sm text-blue-600 hover:underline">
              View All →
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            Your health records and medical history will appear here.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // FALLBACK (Unknown role)
  // ============================================
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold mb-2">Welcome to CareHub</h2>
      <p className="text-gray-600">Please log in to view your dashboard.</p>
      <Link to="/login" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
        Go to Login
      </Link>
    </div>
  );
}
