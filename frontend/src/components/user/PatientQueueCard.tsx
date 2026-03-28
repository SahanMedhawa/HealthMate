import React, { useState, useEffect } from "react";
import { PlayIcon, PauseIcon } from "@heroicons/react/24/solid";
import socketService from '../../services/socket.service';
import api from '../../api/client';

interface AppointmentItem {
  _id: string;
  patientName: string;
  time: string;
  status: "booked" | "in_session" | "completed" | "cancelled";
  queueNumber: number;
}

interface QueueData {
  doctorId: string;
  date: string;
  status: "active" | "paused";
  pauseReason?: string;
  currentAppointments: AppointmentItem[];
  waitingCount: number;
}

interface PatientQueueCardProps {
  doctorId: string;
  doctorName: string;
  specialization?: string;
  date: string;
  currentUserName?: string; // To highlight logged user's appointment
}

const PatientQueueCard: React.FC<PatientQueueCardProps> = ({
  doctorId,
  doctorName,
  specialization,
  date,
  currentUserName,
}) => {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const currentPatient = queueData?.currentAppointments?.find(ap => ap.status === 'in_session');
  const nextAppointments = queueData?.currentAppointments
    ?.filter((a) => a.status === "booked")
    ?.slice(0, 3) || [];

  const fetchQueueStatus = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch both queue status and appointments like DoctorQueueCard does
      const [queueResponse, appointmentsResponse] = await Promise.all([
        api.get(`/doctor/queue/status?doctorId=${doctorId}&date=${date}`),
        api.get(`/appointment/doctor/${doctorId}/date/${date}`)
      ]);

      const queueData = queueResponse.data;
      const appointmentsData = appointmentsResponse.data;

      if (queueData.success && queueData.data) {
        // Combine queue status with appointments data
        const combinedData = {
          ...queueData.data,
          currentAppointments: appointmentsData.appointments || []
        };
        setQueueData(combinedData);
      } else {
        setQueueData(null);
        setError(queueData.message || 'No queue found for this date');
      }
    } catch (error: any) {
      setError('Failed to fetch queue status');
      console.error('Queue status error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();

    const unsubscribe = socketService.onQueueStatusUpdate((data) => {
      if (data.doctorId === doctorId && data.date === date) {
        setLastUpdate(new Date());
        fetchQueueStatus();
      }
    });

    const unsubscribeAppointment = socketService.onAppointmentUpdate((data) => {
      if (data.doctorId === doctorId) {
        setLastUpdate(new Date());
        fetchQueueStatus();
      }
    });

    if (socketService.isSocketConnected()) {
      socketService.joinDoctorQueue(doctorId, date);
    }

    return () => {
      unsubscribe();
      unsubscribeAppointment();
      socketService.leaveDoctorQueue(doctorId, date);
    };
  }, [doctorId, date]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 font-medium">Loading queue status...</p>
        </div>
      </div>
    );
  }

  if (error && !queueData) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const waitingCount = queueData?.waitingCount || 0;
  const totalAppointments = queueData?.currentAppointments?.length || 0;
  const status = queueData?.status || 'active';
  const pauseReason = queueData?.pauseReason;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-xl">{doctorName}</h3>
            {specialization && (
              <div className="flex items-center mt-2 space-x-2">
                <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-blue-50 text-sm font-medium">
                  {specialization}
                </span>
                <span className="text-blue-100 text-sm">•</span>
                <span className="text-blue-100 text-sm">{new Date(date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${status === 'active' ? 'bg-green-500/20' : 'bg-red-500/20'
            } backdrop-blur-sm`}>
            {status === 'active' ? (
              <PlayIcon className="w-5 h-5 text-green-300" />
            ) : (
              <PauseIcon className="w-5 h-5 text-red-300" />
            )}
            <span className="text-white text-sm font-semibold capitalize">
              {status === 'active' ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 text-center border border-blue-100 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-blue-700">{totalAppointments}</div>
            <div className="text-sm text-blue-600 font-medium mt-1">Total Appointments</div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-5 text-center border border-teal-100 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-teal-700">{waitingCount}</div>
            <div className="text-sm text-teal-600 font-medium mt-1">In Queue</div>
          </div>
        </div>

        {status === "paused" && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <PauseIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-red-900">Queue Paused</div>
                {pauseReason && (
                  <div className="text-sm text-red-700 mt-1">{pauseReason}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Patient */}
        {currentPatient && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 mb-6 border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {currentPatient.patientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{currentPatient.patientName}</h4>
                  <p className="text-sm text-gray-600 font-medium">Currently in session</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                  In Session
                </div>
                <p className="text-xs text-gray-600 mt-2 font-medium">Queue #{currentPatient.queueNumber}</p>
              </div>
            </div>
          </div>
        )}

        {/* Next in Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-base flex items-center">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              Next in Queue
            </h4>
            <div className="text-xs text-gray-500 font-medium">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>

          <div className="space-y-3">
            {nextAppointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-300 mb-3">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="text-sm text-gray-500 font-medium">No upcoming patients in queue</div>
              </div>
            ) : (
              nextAppointments.map((ap, index) => {
                const getInitials = (name: string) => {
                  return name.split(' ').map(n => n[0]).join('').toUpperCase();
                };

                const isCurrentUser = currentUserName && ap.patientName.toLowerCase().includes(currentUserName.toLowerCase());

                return (
                  <div key={ap._id} className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${isCurrentUser
                      ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-2 border-blue-400 shadow-md hover:shadow-lg'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'
                    }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${isCurrentUser ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-blue-100 to-blue-200'
                        }`}>
                        <span className={`font-bold text-sm ${isCurrentUser ? 'text-white' : 'text-blue-700'
                          }`}>
                          {getInitials(ap.patientName)}
                        </span>
                      </div>
                      <div>
                        <div className={`font-semibold text-base ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                          {ap.patientName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-bold">You</span>
                          )}
                        </div>
                        <div className={`text-sm mt-0.5 ${isCurrentUser ? 'text-blue-700 font-medium' : 'text-gray-600'
                          }`}>
                          Appointment • {ap.time}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${ap.status === "in_session"
                          ? "bg-green-500 text-white"
                          : isCurrentUser
                            ? "bg-blue-600 text-white"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                        {ap.status === "in_session" ? "In Session" : "Waiting"}
                      </div>
                      <div className={`text-sm mt-2 font-semibold ${isCurrentUser ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                        #{ap.queueNumber || index + 1}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientQueueCard;
