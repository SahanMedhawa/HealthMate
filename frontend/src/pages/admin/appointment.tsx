import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getAppointments, updateAppointmentStatus } from '../../services/appointment.api';
import type { AppointmentData } from '../../services/appointment.api';

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get stats for today's appointments
  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAppointments = appointments.filter(app => app.date === today);

    return {
      total: todayAppointments.length,
      booked: todayAppointments.filter(app => app.status === 'booked').length,
      inSession: todayAppointments.filter(app => app.status === 'in_session').length,
      completed: todayAppointments.filter(app => app.status === 'completed').length,
      cancelled: todayAppointments.filter(app => app.status === 'cancelled').length,
    };
  };

  const stats = getTodayStats();

  // Filter appointments based on search and filters
  const filteredAppointments = appointments.filter(appointment => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch = 
      appointment.patientId.name.toLowerCase().includes(searchLower) ||
      appointment.doctorId.name.toLowerCase().includes(searchLower);
    
    const matchesStatus = filters.status ? appointment.status === filters.status : true;
    const matchesDateRange = 
      (!filters.startDate || appointment.date >= filters.startDate) &&
      (!filters.endDate || appointment.date <= filters.endDate);

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentData['status']) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      fetchAppointments(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadgeColor = (status: AppointmentData['status']) => {
    switch (status) {
      case 'booked': return 'bg-green-100 text-green-800';
      case 'in_session': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Appointments</h1>
        <p className="text-lg text-gray-600">Manage and monitor all system appointments</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Today</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-green-600">Booked</h3>
          <p className="mt-1 text-2xl font-semibold text-green-900">{stats.booked}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-blue-600">In Session</h3>
          <p className="mt-1 text-2xl font-semibold text-blue-900">{stats.inSession}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-yellow-600">Completed</h3>
          <p className="mt-1 text-2xl font-semibold text-yellow-900">{stats.completed}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-red-600">Cancelled</h3>
          <p className="mt-1 text-2xl font-semibold text-red-900">{stats.cancelled}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by patient or doctor..."
            className="border rounded-lg px-4 py-2"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="border rounded-lg px-4 py-2"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="in_session">In Session</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="date"
            className="border rounded-lg px-4 py-2"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <input
            type="date"
            className="border rounded-lg px-4 py-2"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Queue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.map((appointment) => (
                <tr key={appointment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">#{appointment.queueNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.patientId.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.patientId.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.doctorId.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.doctorId.specialization}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(appointment.date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {appointment.time}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select 
                      className="border rounded-lg px-2 py-1 text-sm"
                      value={appointment.status}
                      onChange={(e) => handleStatusChange(appointment._id, e.target.value as AppointmentData['status'])}
                    >
                      <option value="booked">Booked</option>
                      <option value="in_session">In Session</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Appointments;