import React, { useState, useEffect } from 'react';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/Footer';
import PatientQueueCard from '../../components/user/PatientQueueCard';
import socketService from '../../services/socket.service';
import { useAuth } from '../../context/AuthContext';
import { getDoctors } from '../../services/api';
import type { DoctorData } from '../../services/api';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const QueueStatusPage: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors();
    
    if (!socketService.isSocketConnected()) {
      const userId = user?.id || 'guest-' + Math.random().toString(36).substring(7);
      socketService.connect(userId, 'patient');
      socketService.requestNotificationPermission();
    }
  }, [user]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await getDoctors();
      let list: DoctorData[] = [];
      if (response && Array.isArray((response as any).doctors)) {
        list = (response as any).doctors as DoctorData[];
      } else if (response?.data && Array.isArray((response.data as any).doctors)) {
        list = (response.data as any).doctors as DoctorData[];
      }

      if (list.length > 0) {
        setDoctors(list);
        setSelectedDoctor(list[0]._id || '');
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-30 blur-xl"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-teal-100 rounded-full opacity-40 blur-lg"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Queue Status for{" "}
              <span className="text-blue-600">Healthcare Providers</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Monitor real-time queue status, get updates when doctors are available, and plan your visit accordingly
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
        {/* Doctor Selection */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Check Queue Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Select Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <option>Loading doctors...</option>
                ) : (
                  <>
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.fullName} - {doctor.specialization}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }))}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-medium"
            >
              Today
            </button>
          </div>
        </div>

        {/* Queue Status Display */}
        {selectedDoctor && (
          <div className="max-w-3xl mx-auto">
            <PatientQueueCard
              doctorId={selectedDoctor}
              doctorName={(doctors.find(d => d._id === selectedDoctor)?.fullName) || 'Selected Doctor'}
              specialization={doctors.find(d => d._id === selectedDoctor)?.specialization}
              date={selectedDate}
              currentUserName={user?.name}
            />
          </div>
        )}

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Queues</h3>
            <p className="text-gray-600 text-sm">
              Doctor is currently seeing patients and accepting new appointments
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Paused Queues</h3>
            <p className="text-gray-600 text-sm">
              Doctor has temporarily paused the queue. New appointments not available
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
            <ClockIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Updates</h3>
            <p className="text-gray-600 text-sm">
              Get instant notifications when queue status changes
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
            <InformationCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Queue Information</h3>
            <p className="text-gray-600 text-sm">
              See waiting times, patient counts, and queue details
            </p>
          </div>
        </div>


        {/* Call to Action */}
        {!user && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-blue-100 mb-6">
              Sign up as a patient to book appointments and get real-time queue updates, or contact us to set up your clinic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="bg-white text-blue-600 font-semibold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
              >
                Sign Up as Patient
              </a>
              <a
                href="/doctor/signup"
                className="bg-blue-800 text-white font-semibold py-3 px-8 rounded-xl hover:bg-blue-900 transition-colors border-2 border-white/20 shadow-lg hover:shadow-xl"
              >
                Join as Healthcare Provider
              </a>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default QueueStatusPage;
