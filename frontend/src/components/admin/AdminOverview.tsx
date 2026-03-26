import React, { useState, useEffect } from "react";
import {
  UsersIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { getDashboardStats, type DashboardStats } from "../../services/admin.api";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const displayValue = typeof value === 'number' ? value : 0;
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-center">
        {/* Left-aligned icon */}
        <div className={`flex-shrink-0 p-3 rounded-xl ${color} shadow-sm`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {/* Centered content in remaining space */}
        <div className="ml-4 flex-1 flex flex-col items-center text-center">
          <h3 className="text-sm font-semibold text-gray-600 mb-1">{title}</h3>
          <div className="flex items-baseline justify-center">
            <p className="text-3xl font-bold text-gray-900">{displayValue.toLocaleString()}</p>
            {trend && (
              <span
                className={`ml-2 text-sm font-semibold px-2 py-1 rounded-full ${trend.isPositive ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                  }`}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError("Failed to fetch dashboard statistics");
      }
    } catch (error: any) {
      setError(error.message || "Error fetching dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start">
          <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <button
              onClick={fetchDashboardStats}
              className="mt-4 bg-red-100 px-4 py-2 rounded-xl text-sm font-semibold text-red-800 hover:bg-red-200 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Dashboard Overview</h1>
        <p className="text-lg text-gray-600">
          Real-time insights into your hospital management system
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={stats?.userStats?.totalPatients || 0}
          icon={UsersIcon}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Doctors"
          value={stats?.userStats?.totalDoctors || 0}
          icon={UserGroupIcon}
          color="bg-green-500"
        />
        <StatCard
          title="Active Doctors"
          value={stats?.userStats?.activeDoctors || 0}
          icon={UserGroupIcon}
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Appointments"
          value={stats?.appointmentStats?.total || 0}
          icon={CalendarDaysIcon}
          color="bg-purple-500"
        />
      </div>

      {/* Appointment Statistics */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Appointment Status Overview */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Appointment Status</h3>
            <div className="p-2 bg-blue-100 rounded-xl">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
              <div className="flex items-center">
                <div className="p-1.5 bg-yellow-100 rounded-lg mr-2">
                  <ClockIcon className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Pending</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {stats?.appointmentStats?.pending || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <div className="flex items-center">
                <div className="p-1.5 bg-green-100 rounded-lg mr-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Completed</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {stats?.appointmentStats?.completed || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
              <div className="flex items-center">
                <div className="p-1.5 bg-red-100 rounded-lg mr-2">
                  <XCircleIcon className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Cancelled</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {stats?.appointmentStats?.cancelled || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Statistics */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            <div className="p-2 bg-purple-100 rounded-xl">
              <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <span className="text-sm font-semibold text-gray-700">Today's Appointments</span>
              <span className="text-xl font-bold text-gray-900">
                {stats?.appointmentStats?.today || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
              <span className="text-sm font-semibold text-gray-700">This Week</span>
              <span className="text-xl font-bold text-gray-900">
                {stats?.appointmentStats?.weekly || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl">
              <span className="text-sm font-semibold text-gray-700">This Month</span>
              <span className="text-xl font-bold text-gray-900">
                {stats?.appointmentStats?.monthly || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Recent Appointments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(stats?.recentAppointments || []).length > 0 ? (
                (stats?.recentAppointments || []).map((appointment) => (
                  <tr key={appointment._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {appointment.patientName}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {appointment.doctorName}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500">
                      {appointment.date} at {appointment.time}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${appointment.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : appointment.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : appointment.status === "in_session"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(appointment.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-6 text-center text-sm text-gray-500">
                    No recent appointments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
