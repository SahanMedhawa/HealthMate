import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { format } from "date-fns";
import UpdateAvailability from "../../components/doctor/UpdateAvailability";

type Appointment = {
  _id: string;
  patientName: string;
  time: string;
  queueNumber: number;
  status: "booked" | "in_session" | "completed" | "cancelled";
};

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [totalPatients, setTotalPatients] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch appointments for selected date
      const appointmentsRes = await api.get(`/appointment/doctor/${user.id}/date/${selectedDate}`);
      setAppointments(appointmentsRes.data.appointments || []);

      // Fetch all appointments to calculate stats
      const allAppointmentsRes = await api.get(`/appointment/doctor/${user.id}`);
      const allAppointments = allAppointmentsRes.data.appointments || [];
      
      // Calculate total unique patients
      const uniquePatients = new Set(allAppointments.map((apt: any) => apt.patientName));
      setTotalPatients(uniquePatients.size);

      // Calculate pending reviews (appointments that need attention)
      const pendingCount = allAppointments.filter((apt: any) => 
        apt.status === 'booked' && new Date(apt.date) <= new Date()
      ).length;
      setPendingReviews(pendingCount);

      // Generate recent activity from appointments
      const recentAppointments = allAppointments
        .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .slice(0, 3)
        .map((apt: any) => ({
          id: apt._id,
          type: apt.status === 'completed' ? 'completed' : apt.status === 'booked' ? 'scheduled' : 'updated',
          patientName: apt.patientName,
          time: format(new Date(apt.createdAt || apt.date), 'MMM dd, yyyy'),
          status: apt.status
        }));
      setRecentActivity(recentAppointments);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setAppointments([]);
      setTotalPatients(0);
      setPendingReviews(0);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, user?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {user?.name}!
              </h2>
              <p className="text-blue-100 text-lg">
                Manage your appointments, patients, and medical practice from your dashboard.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Today's Appointments
                </p>
                <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
                <p className="text-xs text-green-600 font-medium">Live count</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <p className="text-3xl font-bold text-gray-900">{totalPatients}</p>
                <p className="text-xs text-blue-600 font-medium">Total patients</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Reviews
                </p>
                <p className="text-3xl font-bold text-gray-900">{pendingReviews}</p>
                <p className="text-xs text-yellow-600 font-medium">Needs attention</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Quick Actions
            </h3>
            <div className="space-y-4">

              <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all duration-200 group">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700">
                      View Patient Records
                    </span>
                    <p className="text-xs text-gray-500">Access patient medical history</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setShowAvailabilityModal(true)}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 group"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">
                      Update Availability
                    </span>
                    <p className="text-xs text-gray-500">Manage your schedule and time slots</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-xl border ${
                    activity.type === 'completed' ? 'bg-green-50 border-green-200' :
                    activity.type === 'scheduled' ? 'bg-blue-50 border-blue-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      activity.type === 'completed' ? 'bg-green-500' :
                      activity.type === 'scheduled' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === 'completed' ? `Appointment with ${activity.patientName} completed` :
                         activity.type === 'scheduled' ? `New appointment with ${activity.patientName} scheduled` :
                         `Appointment with ${activity.patientName} updated`}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Next Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 md:mb-0">
              Next Appointments
            </h3>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Filter by date:</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors font-medium"
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd"))}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors font-medium"
                >
                  Tomorrow
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3 text-sm">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No appointments scheduled for {format(new Date(selectedDate), "EEEE, MMMM do, yyyy")}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.slice(0, 5).map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-sm font-bold text-white">
                        {appointment.patientName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{appointment.patientName}</p>
                      <p className="text-xs text-gray-500">Queue #{appointment.queueNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{appointment.time}</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      appointment.status === "in_session"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : appointment.status === "completed"
                        ? "bg-gray-100 text-gray-800 border border-gray-200"
                        : appointment.status === "booked"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      {appointment.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
              
              {appointments.length > 5 && (
                <div className="mt-6 text-center">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
                    View All {appointments.length} Appointments →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Update Availability Modal */}
      <UpdateAvailability
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        onUpdate={() => {
          // Refresh appointments or any other data if needed
          console.log("Availability updated");
        }}
      />
    </div>
  );
};

export default DoctorDashboard;
