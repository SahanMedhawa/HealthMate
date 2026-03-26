import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  BellAlertIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import socketService from '../../services/socket.service';
import { useAdminAuth } from '../../context/AdminAuthContext';
import api from '../../api/client';

interface QueueInfo {
  _id: string;
  doctorId: {
    _id: string;
    name: string;
    fullName: string;
    specialization: string;
  };
  date: string;
  status: 'active' | 'paused';
  pausedAt?: Date;
  pauseReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface QueueStats {
  total: number;
  active: number;
  paused: number;
  today: number;
}

const AdminQueueDashboard: React.FC = () => {
  const { admin } = useAdminAuth();

  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  useEffect(() => {
    if (admin && !socketService.isSocketConnected()) {
      socketService.connect(admin.id, 'admin');
      socketService.requestNotificationPermission();
    }
  }, [admin]);

  useEffect(() => {
    fetchQueues();
    fetchStats();

    const unsubscribeQueue = socketService.onQueueStatusUpdate((data) => {
      if (data.adminNotification) {
        fetchQueues();
        fetchStats();
      }
    });

    const unsubscribeAppointment = socketService.onAppointmentUpdate(() => {
      // Refresh queues when any appointment is updated/created
      fetchQueues();
      fetchStats();
    });

    return () => {
      unsubscribeQueue();
      unsubscribeAppointment();
    };
  }, [selectedDate, filterStatus]);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/admin/queues');
      const data = response.data;

      if (data.success) {
        let filteredQueues = data.data.queues || [];

        console.log('[AdminQueueDashboard] Raw queues from API:', filteredQueues.length);
        console.log('[AdminQueueDashboard] Selected date:', selectedDate);

        if (selectedDate) {
          filteredQueues = filteredQueues.filter((queue: QueueInfo) => queue.date === selectedDate);
          console.log('[AdminQueueDashboard] Queues after date filter:', filteredQueues.length);
        }

        if (filterStatus !== 'all') {
          filteredQueues = filteredQueues.filter((queue: QueueInfo) => queue.status === filterStatus);
          console.log('[AdminQueueDashboard] Queues after status filter:', filteredQueues.length);
        }

        console.log('[AdminQueueDashboard] Final filtered queues:', filteredQueues.length);
        setQueues(filteredQueues);
      } else {
        setError(data.message || 'Failed to fetch queues');
      }
    } catch (error: any) {
      setError('Failed to fetch queues');
      console.error('Fetch queues error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/queue-stats');
      const data = response.data;

      if (data.success) {
        console.log('[AdminQueueDashboard] Received stats:', data.data);
        setStats(data.data);
      } else {
        console.error('[AdminQueueDashboard] Failed to fetch stats:', data.message);
      }
    } catch (error: any) {
      console.error('[AdminQueueDashboard] Fetch stats error:', error);
    }
  };

  const formatDateTime = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access queue monitoring</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Queue Dashboard</h1>
        <p className="text-lg text-gray-600">
          Monitor and manage all doctor queues across the system
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Queues</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Paused</p>
                <p className="text-2xl font-bold text-red-600">{stats.paused}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Queues</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'paused')}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Monitor */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Queue Monitor</h3>
          <p className="text-sm text-blue-100 mt-1">Real-time monitoring of all doctor queues</p>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {loading && queues.length === 0 ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : queues.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {loading ? 'Loading queues...' : 'No queues found for the selected filters'}
              </p>
            </div>
          ) : (
            queues.map((queue) => (
              <div key={queue._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${queue.status === 'active'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                        }`}>
                        {queue.status === 'active' ? (
                          <PlayIcon className="h-6 w-6 text-green-600" />
                        ) : (
                          <PauseIcon className="h-6 w-6 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {queue.doctorId.fullName || queue.doctorId.name}
                        </h4>
                        <p className="text-sm text-gray-600">{queue.doctorId.specialization}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(queue.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">Date</p>
                        </div>

                        <div className={`px-4 py-2 rounded-full ${queue.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}>
                          <p className="text-sm font-bold uppercase">
                            {queue.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    {queue.status === 'paused' && queue.pauseReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 ml-16">
                        <p className="text-sm text-red-800">
                          <strong>Reason:</strong> {queue.pauseReason}
                        </p>
                        {queue.pausedAt && (
                          <p className="text-xs text-red-600 mt-1">
                            Since: {formatDateTime(queue.pausedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500 ml-16">
                      <span>Created: {formatDateTime(queue.createdAt)}</span>
                      <span>Last updated: {formatDateTime(queue.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Real-time Status */}
      {socketService.isSocketConnected() && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm text-green-700">Real-time monitoring enabled</p>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Real-time Monitoring</h4>
          <p className="text-sm text-gray-600">
            Monitor all doctor queues in real-time. See when doctors pause or resume instantly.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <ChartBarSquareIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Queue Statistics</h4>
          <p className="text-sm text-gray-600">
            View comprehensive statistics about queue usage, active queues, and daily patterns.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <BellAlertIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Status Alerts</h4>
          <p className="text-sm text-gray-600">
            Get notified when doctors pause queues or when there are issues that need attention.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminQueueDashboard;
