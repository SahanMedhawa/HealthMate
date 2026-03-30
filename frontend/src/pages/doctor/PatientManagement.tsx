import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Patient {
  _id: string;
  name: string;
  email: string;
  contact?: string;
  address?: string;
  totalAppointments: number;
  lastAppointment?: string;
  nextAppointment?: string;
  status: "active" | "inactive";
  photoURL?: string;
  profilePictureUrl?: string;
}

type Appointment = {
  _id: string;
  patientName: string;
  time: string;
  date: string;
  queueNumber: number;
  status: "booked" | "in_session" | "completed" | "cancelled";
  patientAddress?: string;
  patientContact?: string;
  notes?: string;
};

type DayStats = {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
};

const PatientManagement: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'analytics'>('overview');
  
  // Pagination state
  const [currentPatientPage, setCurrentPatientPage] = useState(1);
  const [currentAppointmentPage, setCurrentAppointmentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  // Auto-refresh data when week changes
  useEffect(() => {
    const checkWeekChange = () => {
      const now = new Date();
      const currentWeek = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekCheck = localStorage.getItem('lastWeekCheck');
      
      if (lastWeekCheck) {
        const lastWeek = new Date(lastWeekCheck);
        if (currentWeek.getTime() !== lastWeek.getTime()) {
          // Week has changed, refresh data
          fetchData();
        }
      }
      
      // Update the last week check
      localStorage.setItem('lastWeekCheck', currentWeek.toISOString());
    };

    // Check immediately
    checkWeekChange();

    // Set up interval to check every hour
    const interval = setInterval(checkWeekChange, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [user?.id]);

  // Manual refresh function
  const refreshAnalytics = () => {
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch appointments for analytics
      const appointmentsResponse = await api.get(`/appointment/doctor/${user?.id}`);
      const allAppointments = appointmentsResponse.data.appointments || appointmentsResponse.data.data || [];
      setAppointments(allAppointments);
      
      // Calculate week stats
      calculateWeekStats(allAppointments);
      
      // Extract unique patients from appointments
      const patientMap = new Map<string, Patient>();
      
      allAppointments.forEach((appointment: any) => {
        // Use patientName as key to ensure we capture all unique patients
        const patientKey = appointment.patientName;
        
        if (!patientMap.has(patientKey)) {
          patientMap.set(patientKey, {
            _id: appointment.patientId || appointment._id, // Use patientId if available, fallback to appointment._id
            name: appointment.patientName,
            email: "N/A", // We don't have email in appointments, could be fetched separately
            contact: appointment.patientContact,
            address: appointment.patientAddress,
            totalAppointments: 0,
            lastAppointment: undefined,
            nextAppointment: undefined,
            status: "active",
            photoURL: undefined, // Will be fetched separately
            profilePictureUrl: undefined
          });
        }
        
        const patient = patientMap.get(patientKey)!;
        patient.totalAppointments++;
        
        // Update last appointment
        if (!patient.lastAppointment || appointment.date > patient.lastAppointment) {
          patient.lastAppointment = appointment.date;
        }
        
        // Update next appointment (future appointments)
        const appointmentDate = new Date(appointment.date);
        const today = new Date();
        if (appointmentDate > today && (!patient.nextAppointment || appointment.date < patient.nextAppointment)) {
          patient.nextAppointment = appointment.date;
        }
      });

      // Fetch patient profile pictures from the database
      const patientsArray = Array.from(patientMap.values());
      
      // Fetch user details for each patient to get their photoURL
      const patientsWithPhotos = await Promise.all(
        patientsArray.map(async (patient) => {
          try {
            // Fetch patient details from the backend
            const patientResponse = await api.get(`/patient/user/${patient._id}`);
            
            if (patientResponse.data.success && patientResponse.data.user) {
              const userData = patientResponse.data.user;
              return {
                ...patient,
                email: userData.email || patient.email,
                photoURL: userData.photoURL,
                profilePictureUrl: userData.profilePictureUrl
              };
            }
          } catch (error) {
            console.warn(`Could not fetch patient details for ${patient.name}:`, error);
          }
          
          // Fallback if API call fails
          return {
            ...patient,
            email: patient.email || "N/A",
            photoURL: undefined,
            profilePictureUrl: undefined
          };
        })
      );
      
      setPatients(patientsWithPhotos);
    } catch (error) {
      console.error("Error fetching data:", error);
      setPatients([]);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeekStats = (allAppointments: Appointment[]) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    
    // Update current week start if it's a new week
    if (weekStart.getTime() !== currentWeekStart.getTime()) {
      setCurrentWeekStart(weekStart);
    }
    
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const stats = weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAppointments = allAppointments.filter(app => app.date === dayStr);
      
      return {
        date: dayStr,
        total: dayAppointments.length,
        completed: dayAppointments.filter(app => app.status === 'completed').length,
        cancelled: dayAppointments.filter(app => app.status === 'cancelled').length,
        revenue: dayAppointments.filter(app => app.status === 'completed').length * 50, // Assuming $50 per appointment
      };
    });
    
    setWeekStats(stats);
  };

  // Calculate overall statistics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(app => app.status === 'completed').length;
  const cancelledAppointments = appointments.filter(app => app.status === 'cancelled').length;
  const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments * 100).toFixed(1) : '0';
  const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments * 100).toFixed(1) : '0';
  
  // Recent appointments (last 7 days)
  const recentAppointments = appointments
    .filter(app => {
      const appointmentDate = new Date(app.date);
      const sevenDaysAgo = subDays(new Date(), 7);
      return appointmentDate >= sevenDaysAgo;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Top patients (most frequent)
  const patientFrequency = appointments.reduce((acc, app) => {
    acc[app.patientName] = (acc[app.patientName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topPatients = Object.entries(patientFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPatientPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const totalAppointmentPages = Math.ceil(appointments.length / itemsPerPage);
  
  const startPatientIndex = (currentPatientPage - 1) * itemsPerPage;
  const endPatientIndex = startPatientIndex + itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startPatientIndex, endPatientIndex);
  
  const startAppointmentIndex = (currentAppointmentPage - 1) * itemsPerPage;
  const endAppointmentIndex = startAppointmentIndex + itemsPerPage;
  const paginatedAppointments = appointments.slice(startAppointmentIndex, endAppointmentIndex);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPatientPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    setCurrentAppointmentPage(1);
  }, [appointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "booked": return "bg-blue-100 text-blue-800";
      case "in_session": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4 text-lg">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Patient Management</h1>
        <p className="text-lg text-gray-600">
          Comprehensive view of your patients, appointments, and practice analytics
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'patients', name: 'Patient List', icon: UserGroupIcon },
              { id: 'appointments', name: 'Appointments', icon: CalendarDaysIcon },
              { id: 'analytics', name: 'Analytics', icon: ClockIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-900">{patients.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                  <p className="text-3xl font-bold text-gray-900">{totalAppointments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600">{completionRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                  <ArrowTrendingDownIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
                  <p className="text-3xl font-bold text-red-600">{cancellationRate}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentAppointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent appointments</p>
                ) : (
                  recentAppointments.map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {appointment.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {appointment.patientName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.date} at {appointment.time}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                        {appointment.status.replace("_", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Patients */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Frequent Patients</h3>
              <div className="space-y-3">
                {topPatients.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No patient data available</p>
                ) : (
                  topPatients.map(([patientName, count], index) => (
                    <div key={patientName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8">
                          {index < 3 ? (
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 'bg-yellow-600'
                            }`} />
                          ) : (
                            <span className="text-gray-400 font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{patientName}</div>
                          <div className="text-xs text-gray-500">{count} appointments</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-blue-600">
                        {count}x
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Patients</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <div className="relative">
                  <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="all">All Patients</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Patient List ({filteredPatients.length})</h3>
                {totalPatientPages > 1 && (
                  <div className="text-sm text-gray-500">
                    Page {currentPatientPage} of {totalPatientPages}
                  </div>
                )}
              </div>
            </div>
            
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserGroupIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">No patients found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm ? "Try adjusting your search criteria" : "Patients will appear here once they book appointments with you"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {paginatedPatients.map((patient) => (
                  <div key={patient._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg overflow-hidden">
                          {(() => {
                            console.log(`Patient ${patient.name} photoURL:`, patient.photoURL);
                            console.log(`Patient ${patient.name} profilePictureUrl:`, patient.profilePictureUrl);
                            const hasPhoto = patient.photoURL || patient.profilePictureUrl;
                            console.log(`Patient ${patient.name} has photo:`, hasPhoto);
                            
                            return (
                              <img
                                src={
                                  patient.photoURL ||
                                  patient.profilePictureUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    patient.name
                                  )}&background=3b82f6&color=fff`
                                }
                                alt={patient.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.log(`Image failed to load for ${patient.name}`);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.textContent = patient.name.charAt(0);
                                  }
                                }}
                                onLoad={() => {
                                  console.log(`Image loaded successfully for ${patient.name}`);
                                }}
                              />
                            );
                          })()}
                        </div>
                        <div className="text-left">
                          <h4 className="text-lg font-semibold text-gray-900 text-left">{patient.name}</h4>
                          <p className="text-sm text-gray-600 text-left">{patient.email}</p>
                          {patient.contact && (
                            <p className="text-xs text-gray-500 text-left">Contact: {patient.contact}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{patient.totalAppointments}</p>
                          <p className="text-xs text-gray-500">Appointments</p>
                        </div>
                        
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {patient.lastAppointment ? format(new Date(patient.lastAppointment), "MMM dd, yyyy") : "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">Last Visit</p>
                        </div>
                        
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {patient.nextAppointment ? format(new Date(patient.nextAppointment), "MMM dd, yyyy") : "None"}
                          </p>
                          <p className="text-xs text-gray-500">Next Visit</p>
                        </div>
                        
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(patient.status)}`}>
                          {patient.status}
                        </span>
                      </div>
                    </div>
                    
                    {patient.address && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Address:</span> {patient.address}
                        </p>
                      </div>
                    )}
                    
                    {/* Patient's Recent Appointments */}
                    {(() => {
                      const patientAppointments = appointments
                        .filter(apt => apt.patientName === patient.name)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 3);
                      
                      return patientAppointments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-700 mb-2">Recent Appointments:</p>
                          <div className="space-y-2">
                            {patientAppointments.map((apt) => (
                              <div key={apt._id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                                  <span className="text-gray-600">
                                    {format(new Date(apt.date), 'MMM dd, yyyy')} at {apt.time}
                                  </span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                                  {apt.status.replace("_", " ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
            
            {/* Patient Pagination Controls */}
            {totalPatientPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {startPatientIndex + 1} to {Math.min(endPatientIndex, filteredPatients.length)} of {filteredPatients.length} patients
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPatientPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPatientPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md">
                      {currentPatientPage}
                    </span>
                    <button
                      onClick={() => setCurrentPatientPage(prev => Math.min(prev + 1, totalPatientPages))}
                      disabled={currentPatientPage === totalPatientPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {/* Appointments List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Appointments ({appointments.length})</h3>
                {totalAppointmentPages > 1 && (
                  <div className="text-sm text-gray-500">
                    Page {currentAppointmentPage} of {totalAppointmentPages}
                  </div>
                )}
              </div>
            </div>
            
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">No appointments found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Appointments will appear here once patients book with you
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {paginatedAppointments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((appointment) => (
                  <div key={appointment._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg overflow-hidden">
                          <img
                            src={
                              (() => {
                                // Find the patient data to get their profile picture
                                const patientData = patients.find(p => p.name === appointment.patientName);
                                return patientData?.photoURL ||
                                       patientData?.profilePictureUrl ||
                                       `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                         appointment.patientName
                                       )}&background=3b82f6&color=fff`;
                              })()
                            }
                            alt={appointment.patientName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.textContent = appointment.patientName.charAt(0);
                              }
                            }}
                          />
                        </div>
                        <div className="text-left">
                          <h4 className="text-lg font-semibold text-gray-900 text-left">{appointment.patientName}</h4>
                          <p className="text-sm text-gray-600 text-left">
                            {format(new Date(appointment.date), 'EEEE, MMM dd, yyyy')} at {appointment.time}
                          </p>
                          {appointment.patientContact && (
                            <p className="text-xs text-gray-500 text-left">Contact: {appointment.patientContact}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">#{appointment.queueNumber}</p>
                          <p className="text-xs text-gray-500">Queue</p>
                        </div>
                        
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.patientAddress ? appointment.patientAddress.substring(0, 20) + '...' : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">Address</p>
                        </div>
                        
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(appointment.status)}`}>
                          {appointment.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Appointment Pagination Controls */}
            {totalAppointmentPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {startAppointmentIndex + 1} to {Math.min(endAppointmentIndex, appointments.length)} of {appointments.length} appointments
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentAppointmentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentAppointmentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md">
                      {currentAppointmentPage}
                    </span>
                    <button
                      onClick={() => setCurrentAppointmentPage(prev => Math.min(prev + 1, totalAppointmentPages))}
                      disabled={currentAppointmentPage === totalAppointmentPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Weekly Activity Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 text-left">Weekly Activity</h3>
                <p className="text-sm text-gray-500 mt-1 text-left">
                  Week of {format(currentWeekStart, 'MMM dd, yyyy')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="flex items-center space-x-3 ml-4">
                <button
                  onClick={refreshAnalytics}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-medium">Refresh</span>
                </button>
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Live Data</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            
             <div className="space-y-4">
               {weekStats.map((day, index) => {
                 const completionRate = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                 return (
                   <div key={day.date} className="flex items-center space-x-4">
                     <div className="w-20 text-sm font-medium text-gray-600">
                       {format(new Date(day.date), 'EEE')}
                     </div>
                     <div className="flex-1">
                       <div className="flex items-center space-x-2">
                         <div className="flex-1 bg-gray-200 rounded-full h-3">
                           <div
                             className={`h-3 rounded-full transition-all duration-300 ${
                               completionRate === 100 ? 'bg-green-500' : 
                               completionRate >= 70 ? 'bg-blue-500' : 
                               completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                             }`}
                             style={{ width: `${completionRate}%` }}
                           ></div>
                         </div>
                         <div className="text-sm font-medium text-gray-900 w-12 text-right">
                           {day.total}
                         </div>
                       </div>
                       <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                         <span>✅ {day.completed} completed</span>
                         <span>❌ {day.cancelled} cancelled</span>
                         <span className="font-medium text-gray-700">
                           {completionRate.toFixed(0)}% completion
                         </span>
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Performance Insights</h3>
                <p className="text-gray-600">Key metrics and recommendations for your practice</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Efficiency Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                    <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
                    <div className="text-sm text-gray-500">Completion Rate</div>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-3">📈 Efficiency</h4>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Performance</span>
                    <span className={`text-sm font-medium ${
                      parseFloat(completionRate) > 85 ? 'text-green-600' : 
                      parseFloat(completionRate) > 70 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {parseFloat(completionRate) > 85 ? 'Excellent' : 
                       parseFloat(completionRate) > 70 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        parseFloat(completionRate) > 85 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                        parseFloat(completionRate) > 70 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${Math.min(parseFloat(completionRate), 100)}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {parseFloat(completionRate) > 85 
                    ? 'Outstanding performance! Your completion rate shows excellent patient care.'
                    : parseFloat(completionRate) > 70 
                    ? 'Good efficiency. Consider optimizing scheduling to improve further.'
                    : 'Focus on reducing cancellations and improving patient follow-through.'}
                </p>
              </div>
              
              {/* Patient Loyalty Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {topPatients.length > 0 ? topPatients[0][1] : '0'}
                    </div>
                    <div className="text-sm text-gray-500">Top Patient Visits</div>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-3">👥 Patient Loyalty</h4>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Loyalty Score</span>
                    <span className={`text-sm font-medium ${
                      topPatients.length > 0 && topPatients[0][1] > 3 ? 'text-green-600' : 
                      topPatients.length > 0 && topPatients[0][1] > 1 ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {topPatients.length > 0 && topPatients[0][1] > 3 ? 'High' : 
                       topPatients.length > 0 && topPatients[0][1] > 1 ? 'Medium' : 'Building'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        topPatients.length > 0 && topPatients[0][1] > 3 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                        topPatients.length > 0 && topPatients[0][1] > 1 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                      }`}
                      style={{ width: `${topPatients.length > 0 ? Math.min((topPatients[0][1] / 5) * 100, 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {topPatients.length > 0 
                    ? `${topPatients[0][1]} visits from your top patient shows strong loyalty and trust.`
                    : 'Building patient relationships. Focus on quality care to increase repeat visits.'}
                </p>
              </div>
              
              {/* Scheduling Card */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-md">
                    <ClockIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{cancellationRate}%</div>
                    <div className="text-sm text-gray-500">Cancellation Rate</div>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-3">📅 Scheduling</h4>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Efficiency</span>
                    <span className={`text-sm font-medium ${
                      parseFloat(cancellationRate) < 10 ? 'text-green-600' : 
                      parseFloat(cancellationRate) < 20 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {parseFloat(cancellationRate) < 10 ? 'Excellent' : 
                       parseFloat(cancellationRate) < 20 ? 'Good' : 'Needs Attention'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        parseFloat(cancellationRate) < 10 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                        parseFloat(cancellationRate) < 20 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                      }`}
                      style={{ width: `${Math.min(parseFloat(cancellationRate), 100)}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {parseFloat(cancellationRate) < 10 
                    ? 'Excellent scheduling management! Your cancellation rate is very low.'
                    : parseFloat(cancellationRate) < 20 
                    ? 'Good scheduling. Consider implementing reminder systems to reduce cancellations further.'
                    : 'High cancellation rate. Implement reminder systems and flexible rescheduling options.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagement;
