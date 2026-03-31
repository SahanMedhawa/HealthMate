import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import VideoRoom from '../../components/telemedicine/VideoRoom';
import {
  createConsultation,
  updateConsultationStatus,
  getDoctorHistory,
} from '../../services/telemedicine.api';
import type { Consultation, ConsultationStatus } from '../../services/telemedicine.api';
import {
  VideoCameraIcon,
  PlusCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PhoneXMarkIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

/* ────────────── local types ────────────── */

interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientContact: string;
  date: string;
  time: string;
  status: string;
  queueNumber: number;
}

const STATUS_BADGE: Record<ConsultationStatus, { bg: string; text: string; dot: string }> = {
  SCHEDULED:   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  IN_PROGRESS: { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  COMPLETED:   { bg: 'bg-gray-100',   text: 'text-gray-800',   dot: 'bg-gray-500'   },
  CANCELLED:   { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
};

/* ────────────── component ────────────── */

const DoctorTelemedicine: React.FC = () => {
  const { user } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [serviceDown, setServiceDown] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState('');

  const [activeVideo, setActiveVideo] = useState<Consultation | null>(null);

  /* ── data loading ── */

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setServiceDown(false);

    // Load appointments independently — this must work even if telemedicine service is down
    try {
      const apptRes = await api.get(`/appointment/doctor/${user.id}`);
      const booked: Appointment[] = (apptRes.data.appointments || []).filter(
        (a: Appointment) => a.status === 'booked' || a.status === 'in_session',
      );
      setAppointments(booked);
    } catch {
      setAppointments([]);
    }

    // Load telemedicine history separately
    try {
      const historyRes = await getDoctorHistory(user.id);
      setConsultations(historyRes);
    } catch {
      setConsultations([]);
      setServiceDown(true);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── helpers ── */

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };
  const clearError = () => setError('');

  const availableAppointments = appointments.filter(
    (a) => !consultations.some((c) => c.appointmentId === a._id),
  );

  const active   = consultations.filter((c) => c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS');
  const history  = consultations.filter((c) => c.status === 'COMPLETED' || c.status === 'CANCELLED');

  /* ── actions ── */

  const handleCreate = async () => {
    if (!selectedAppointment || !user) return;
    const appt = appointments.find((a) => a._id === selectedAppointment);
    if (!appt) return;

    setCreating(true);
    clearError();
    try {
      await createConsultation({
        appointmentId: appt._id,
        patientId: appt.patientId,
        patientName: appt.patientName,
        doctorName: user.name,
        scheduledAt: new Date(`${appt.date}T${appt.time}`).toISOString(),
        notes: sessionNotes || undefined,
      });
      flash('Consultation session created successfully');
      setShowCreateModal(false);
      setSelectedAppointment('');
      setSessionNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (c: Consultation, status: ConsultationStatus) => {
    clearError();
    try {
      await updateConsultationStatus(c.appointmentId, { status });
      flash(`Session ${status === 'IN_PROGRESS' ? 'started' : status.toLowerCase()}`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  /* ── render ── */

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to access telemedicine</p>
      </div>
    );
  }

  return (
    <>
      {/* Jitsi overlay */}
      {activeVideo && (
        <VideoRoom
          joinLink={activeVideo.joinLink}
          roomId={activeVideo.roomId}
          patientName={activeVideo.patientName ?? undefined}
          doctorName={activeVideo.doctorName ?? undefined}
          onClose={() => setActiveVideo(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <VideoCameraIcon className="h-8 w-8" />
                Telemedicine
              </h2>
              <p className="text-blue-100 text-lg">
                Create and manage video consultation sessions with your patients
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={appointments.length === 0}
              className="flex items-center gap-2 bg-white text-blue-700 font-semibold px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircleIcon className="h-5 w-5" />
              New Session
            </button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {serviceDown && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <ClockIcon className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Telemedicine service is starting up or unavailable
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                You can still create sessions — they will be saved once the service is online.
                Make sure the Spring Boot service is running on port 5005.
              </p>
            </div>
            <button onClick={loadData} className="ml-auto text-amber-700 hover:text-amber-900 shrink-0">
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" /> {success}
            </p>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Sessions',  value: consultations.length, icon: VideoCameraIcon,  gradient: 'from-blue-500 to-blue-600' },
            { label: 'Scheduled',        value: consultations.filter(c => c.status === 'SCHEDULED').length,   icon: ClockIcon,       gradient: 'from-yellow-500 to-yellow-600' },
            { label: 'In Progress',      value: consultations.filter(c => c.status === 'IN_PROGRESS').length, icon: PlayIcon,        gradient: 'from-green-500 to-green-600' },
            { label: 'Completed',        value: consultations.filter(c => c.status === 'COMPLETED').length,   icon: CheckCircleIcon, gradient: 'from-purple-500 to-purple-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className={`p-3 bg-gradient-to-br ${s.gradient} rounded-xl shadow-lg`}>
                  <s.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Active Sessions ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            Active Sessions
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-gray-500 mt-3 text-sm">Loading sessions…</p>
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-12">
              <VideoCameraIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active sessions</p>
              <p className="text-gray-400 text-sm mt-1">Create a new session to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((c) => {
                const badge = STATUS_BADGE[c.status];
                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                        <span className="text-sm font-bold text-white">
                          {(c.patientName ?? 'P').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.patientName ?? 'Patient'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(c.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {c.status.replace('_', ' ')}
                      </span>

                      {c.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStatusChange(c, 'IN_PROGRESS')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <PlayIcon className="h-4 w-4" /> Start
                        </button>
                      )}

                      {c.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => setActiveVideo(c)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            <VideoCameraIcon className="h-4 w-4" /> Join Call
                          </button>
                          <button
                            onClick={() => handleStatusChange(c, 'COMPLETED')}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                          >
                            <PhoneXMarkIcon className="h-4 w-4" /> End
                          </button>
                        </>
                      )}

                      {(c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => handleStatusChange(c, 'CANCELLED')}
                          className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                          <XCircleIcon className="h-4 w-4" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── History ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Session History</h3>

          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No past sessions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Patient</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Scheduled</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Duration</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((c) => {
                    const badge = STATUS_BADGE[c.status];
                    let duration = '—';
                    if (c.startTime && c.endTime) {
                      const mins = Math.round(
                        (new Date(c.endTime).getTime() - new Date(c.startTime).getTime()) / 60000,
                      );
                      duration = `${mins} min`;
                    }
                    return (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{c.patientName ?? '—'}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(c.scheduledAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{duration}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Session Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <h3 className="text-xl font-bold text-gray-900">Create Telemedicine Session</h3>

            {availableAppointments.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No eligible appointments found. Only booked or in-session appointments without
                an existing consultation can be used.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Select Appointment
                  </label>
                  <select
                    value={selectedAppointment}
                    onChange={(e) => setSelectedAppointment(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Choose an appointment…</option>
                    {availableAppointments.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.patientName} — {a.date} at {a.time} (#{a.queueNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Notes <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    placeholder="Reason for consultation, instructions…"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={!selectedAppointment || creating}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <VideoCameraIcon className="h-5 w-5" /> Create Session
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DoctorTelemedicine;
