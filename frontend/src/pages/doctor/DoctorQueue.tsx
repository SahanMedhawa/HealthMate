import React, { useState, useEffect } from 'react';
import DoctorQueueCard from '../../components/doctor/DoctorQueueCard';
import socketService from '../../services/socket.service';
import { useAuth } from '../../context/AuthContext';
import { 
  SparklesIcon, 
  BoltIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';

const DoctorQueue: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );

  useEffect(() => {
    // Initialize socket connection if not already connected
    if (user && !socketService.isSocketConnected()) {
      socketService.connect(user.id, 'doctor');
      socketService.requestNotificationPermission();
    }

    return () => {
      // Don't disconnect here as other components might be using the socket
    };
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access queue management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Queue Management
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Control your appointment queue and manage patient flow with real-time updates
          </p>
        </div>

        {/* Date Selection Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-blue-600" />
                Select Date
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Managing queue for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
              />
              <button
                onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }))}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Doctor Queue Card */}
        <div className="max-w-3xl mx-auto">
          <DoctorQueueCard
            doctorId={user.id}
            date={selectedDate}
            onAppointmentUpdate={(appointment) => {
              console.log('Appointment updated:', appointment);
            }}
          />
        </div>

        {/* Real-time Status */}
        {socketService.isSocketConnected() && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <p className="text-sm font-medium text-green-800">Real-time updates enabled</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Interactive Dashboard</h4>
            <p className="text-sm text-gray-600">
              See current patient, queue status, and manage sessions all in one beautiful card
            </p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BoltIcon className="h-6 w-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">One-Click Actions</h4>
            <p className="text-sm text-gray-600">
              Start sessions, complete appointments, and control queue with single clicks
            </p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Real-time Updates</h4>
            <p className="text-sm text-gray-600">
              Patients and admin see changes instantly with live notifications
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorQueue;
