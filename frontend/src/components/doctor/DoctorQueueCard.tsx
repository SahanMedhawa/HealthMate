import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  PauseIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import socketService from '../../services/socket.service';
import api from '../../services/api';
import PrescriptionModal from './PrescriptionModal';

interface QueueStatus {
  doctorId: string;
  date: string;
  status: 'active' | 'paused';
  currentAppointments: any[];
  waitingCount: number;
  pausedAt?: Date;
  pauseReason?: string;
}

interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientContact: string;
  patientAddress: string;
  date: string;
  time: string;
  status: 'booked' | 'in_session' | 'completed' | 'cancelled';
  queueNumber: number;
  notes?: string;
  rescheduledFrom?: {
    date: string;
    time: string;
  };
  cancellationReason?: string;
}

interface DoctorQueueCardProps {
  doctorId: string;
  date: string;
  onAppointmentUpdate?: (appointment: Appointment) => void;
}

const DoctorQueueCard: React.FC<DoctorQueueCardProps> = ({
  doctorId,
  date,
  onAppointmentUpdate,
}) => {
  // Queue Status State
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Queue Control State
  const [pauseReason, setPauseReason] = useState('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Prescription Modal State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionPatient, setPrescriptionPatient] = useState<{
    appointmentId: string;
    patientId: string;
    patientName: string;
  } | null>(null);

  // Current patient in session
  const currentPatient = appointments.find(app => app.status === 'in_session');
  const nextPatients = appointments
    .filter(app => app.status === 'booked')
    .sort((a, b) => a.queueNumber - b.queueNumber)
    .slice(0, 3);

  const completedToday = appointments.filter(app => app.status === 'completed').length;
  const totalToday = appointments.length;
  const waitingCount = appointments.filter(app => app.status === 'booked' || app.status === 'in_session').length;

  useEffect(() => {
    fetchData();

    const unsubscribe = socketService.onQueueStatusUpdate((data) => {
      if (data.doctorId === doctorId && data.date === date) {
        setLastUpdate(new Date());
        fetchData();
      }
    });

    const unsubscribeAppointment = socketService.onAppointmentUpdate((data) => {
      if (data.doctorId === doctorId) {
        setLastUpdate(new Date());
        fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch queue status and appointments in parallel
      const [queueResponse, appointmentsResponse] = await Promise.all([
        api.get(`/doctor/queue/status?doctorId=${doctorId}&date=${date}`),
        api.get(`/appointment/doctor/${doctorId}/date/${date}`)
      ]);

      const queueData = queueResponse.data;

      if (queueData.success) {
        setQueueStatus(queueData.data);
      }

      setAppointments(appointmentsResponse.data.appointments || []);

    } catch (error: any) {
      setError('Failed to fetch queue data');
      console.error('Queue data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseQueue = async () => {
    if (!pauseReason.trim()) {
      setError('Please provide a reason for pausing the queue');
      return;
    }

    try {
      setActionLoading(true);
      setError(''); // Clear any previous errors

      const response = await api.post('/doctor/queue/pause', {
        doctorId,
        date,
        reason: pauseReason,
      });

      const data = response.data;

      console.log('Pause queue response:', data);

      if (data.success) {
        // Success - update UI immediately
        await fetchData();
        setShowPauseModal(false);
        setPauseReason('');
        setError('');
        console.log('Queue paused successfully');
      } else {
        // Log the actual error for debugging
        console.error('Pause queue failed:', data.message);
        setError(data.message || 'Failed to pause queue');
      }
    } catch (error: any) {
      setError('Failed to pause queue');
      console.error('Pause queue error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeQueue = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/doctor/queue/resume', {
        doctorId,
        date,
      });

      const data = response.data;

      if (data.success) {
        await fetchData();
        setError('');
      } else {
        setError(data.message || 'Failed to resume queue');
      }
    } catch (error: any) {
      setError('Failed to resume queue');
      console.error('Resume queue error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      setActionLoading(true);
      await api.put(`/appointment/${appointmentId}`, { status: newStatus });
      await fetchData();
      onAppointmentUpdate?.(appointments.find(a => a._id === appointmentId)!);
    } catch (error: any) {
      setError('Failed to update appointment status');
      console.error('Status change error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 font-medium">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-md"></div>
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">
                Clinic Dashboard
              </h3>
              <p className="text-blue-100 text-sm font-medium mt-1">{new Date(date).toLocaleDateString()}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-3 px-4 py-2 rounded-full ${queueStatus?.status === 'active' ? 'bg-green-500/20' : 'bg-red-500/20'
            } backdrop-blur-sm`}>
            {queueStatus?.status === 'active' ? (
              <>
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">Active</span>
                <button
                  onClick={() => setShowPauseModal(true)}
                  disabled={actionLoading}
                  className="ml-1 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Pause Queue"
                >
                  <PauseIcon className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                <span className="text-white text-sm font-semibold">Paused</span>
                <button
                  onClick={handleResumeQueue}
                  disabled={actionLoading}
                  className="ml-1 p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Resume Queue"
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 text-center border border-blue-100 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-blue-700">{totalToday}</div>
            <div className="text-sm text-blue-600 font-medium mt-1">Today's Appointments</div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-5 text-center border border-teal-100 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-teal-700">{waitingCount}</div>
            <div className="text-sm text-teal-600 font-medium mt-1">In Queue</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 text-center border border-green-100 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-green-700">{completedToday}</div>
            <div className="text-sm text-green-600 font-medium mt-1">Completed</div>
          </div>
        </div>

        {/* Queue Status Banner */}
        {queueStatus?.status === 'paused' && queueStatus.pauseReason && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <PauseIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-red-900">Queue Paused</div>
                <div className="text-sm text-red-700 mt-1">{queueStatus.pauseReason}</div>
                {queueStatus.pausedAt && (
                  <div className="text-xs text-red-600 mt-1 font-medium">
                    Since: {new Date(queueStatus.pausedAt).toLocaleTimeString()}
                  </div>
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
                    {getInitials(currentPatient.patientName)}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{currentPatient.patientName}</h4>
                  <p className="text-sm text-gray-600 font-medium">
                    Consultation • Queue #{currentPatient.queueNumber}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-2 shadow-sm">
                  In Session
                </div>
                <p className="text-xs text-gray-600 mb-3 font-medium">Started {currentPatient.time}</p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Full current patient object:', currentPatient);
                      console.log('Prescribe button clicked for patient:', {
                        appointmentId: currentPatient._id,
                        patientId: currentPatient.patientId,
                        patientName: currentPatient.patientName,
                        fullObject: currentPatient
                      });

                      // Get patientId - try different possible field names
                      const patientId = currentPatient.patientId ||
                        (currentPatient as any).patient?._id ||
                        (currentPatient as any).patient;

                      if (!patientId) {
                        alert('Error: Cannot find patient ID in appointment data');
                        console.error('Missing patientId in appointment:', currentPatient);
                        return;
                      }

                      setPrescriptionPatient({
                        appointmentId: currentPatient._id,
                        patientId: patientId,
                        patientName: currentPatient.patientName,
                      });
                      setShowPrescriptionModal(true);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prescribe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(currentPatient._id, 'completed')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Patients Queue */}
        <div className="space-y-4">
          <h4 className="font-bold text-gray-900 text-base flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              Next in Queue
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </h4>

          {/* Queue Items */}
          <div className="space-y-3">
            {nextPatients.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-300 mb-3">
                  <UserIcon className="w-16 h-16 mx-auto" />
                </div>
                <div className="text-sm text-gray-500 font-medium">No patients waiting in queue</div>
              </div>
            ) : (
              nextPatients.map((patient, index) => (
                <div
                  key={patient._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-700 font-bold text-sm">
                        {getInitials(patient.patientName)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">
                        {patient.patientName}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {patient.time} • Queue #{patient.queueNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 shadow-sm">
                      Waiting
                    </div>
                    <div className="text-sm text-gray-600 mt-2 font-medium">
                      ~{(index + 1) * 15} min
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex space-x-3">
          {!currentPatient && nextPatients.length > 0 && (
            <button
              onClick={() => handleStatusChange(nextPatients[0]._id, 'in_session')}
              disabled={actionLoading || queueStatus?.status === 'paused'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Call Next
            </button>
          )}
          {queueStatus?.status === 'paused' ? (
            <button
              onClick={handleResumeQueue}
              disabled={actionLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {actionLoading ? 'Resuming...' : 'Resume Queue'}
            </button>
          ) : (
            <button
              onClick={() => setShowPauseModal(true)}
              disabled={actionLoading}
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl text-sm font-semibold transition-all"
            >
              Pause Queue
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-sm text-red-600 hover:text-red-800 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Pause Modal */}
      {showPauseModal && queueStatus?.status !== 'paused' && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pause Queue
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Please provide a reason for pausing the queue. Patients will be notified.
              </p>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g., Emergency case, Break time, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPauseModal(false);
                    setPauseReason('');
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePauseQueue}
                  disabled={!pauseReason.trim() || actionLoading}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {actionLoading ? 'Pausing...' : 'Pause Queue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && prescriptionPatient && (
        <PrescriptionModal
          appointmentId={prescriptionPatient.appointmentId}
          patientId={prescriptionPatient.patientId}
          patientName={prescriptionPatient.patientName}
          doctorId={doctorId}
          onClose={() => {
            setShowPrescriptionModal(false);
            setPrescriptionPatient(null);
          }}
          onSuccess={() => {
            setShowPrescriptionModal(false);
            setPrescriptionPatient(null);
            fetchData(); // Refresh the queue data
          }}
        />
      )}
    </div>
  );
};

export default DoctorQueueCard;
