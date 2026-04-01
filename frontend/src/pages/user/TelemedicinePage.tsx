import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/Footer';
import VideoRoom from '../../components/telemedicine/VideoRoom';
import { getPatientHistory } from '../../services/telemedicine.api';
import type { Consultation, ConsultationStatus } from '../../services/telemedicine.api';
import {
  VideoCameraIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

const STATUS_BADGE: Record<ConsultationStatus, { bg: string; text: string; dot: string }> = {
  SCHEDULED:   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  IN_PROGRESS: { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  COMPLETED:   { bg: 'bg-gray-100',   text: 'text-gray-800',   dot: 'bg-gray-500'   },
  CANCELLED:   { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
};

const TelemedicinePage: React.FC = () => {
  const { user } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Consultation | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getPatientHistory(user.id);
      setConsultations(data);
    } catch {
      /* error handled silently — empty list shown */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const active  = consultations.filter((c) => c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS');
  const history = consultations.filter((c) => c.status === 'COMPLETED' || c.status === 'CANCELLED');

  return (
    <>
      {activeVideo && (
        <VideoRoom
          joinLink={activeVideo.joinLink}
          roomId={activeVideo.roomId}
          patientName={activeVideo.patientName ?? undefined}
          doctorName={activeVideo.doctorName ?? undefined}
          onClose={() => setActiveVideo(null)}
        />
      )}

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <Navbar />

        {/* Hero */}
        <section className="relative overflow-hidden py-16">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-30 blur-xl" />
            <div className="absolute top-40 right-20 w-24 h-24 bg-teal-100 rounded-full opacity-40 blur-lg" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Video <span className="text-blue-600">Consultations</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with your doctor face-to-face from anywhere — secure, private, and convenient
            </p>
          </div>
        </section>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-10">
          {/* ── Active Sessions ── */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              Your Sessions
            </h2>

            {!user ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Please{' '}
                  <a href="/login" className="text-blue-600 font-medium hover:underline">
                    log in
                  </a>{' '}
                  to view your telemedicine sessions.
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-gray-500 mt-3 text-sm">Loading sessions…</p>
              </div>
            ) : active.length === 0 ? (
              <div className="text-center py-12">
                <VideoCameraIcon className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No upcoming sessions</p>
                <p className="text-gray-400 text-sm mt-1">
                  Your doctor will create a telemedicine session when needed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {active.map((c) => {
                  const badge = STATUS_BADGE[c.status];
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-gray-200 rounded-xl hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                          <VideoCameraIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Dr. {c.doctorName ?? 'Doctor'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(c.scheduledAt).toLocaleString()}
                          </p>
                          {c.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">{c.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {c.status.replace('_', ' ')}
                        </span>

                        {c.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => setActiveVideo(c)}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                          >
                            <VideoCameraIcon className="h-4 w-4" /> Join Call
                          </button>
                        )}

                        {c.status === 'SCHEDULED' && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" /> Waiting for doctor to start
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── History ── */}
          {user && history.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Consultation History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Doctor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
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
                          <td className="py-3 px-4 font-medium text-gray-900">
                            Dr. {c.doctorName ?? '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(c.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{duration}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                            >
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
            </div>
          )}

          {/* ── Info Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
              <ShieldCheckIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Private</h3>
              <p className="text-gray-600 text-sm">
                End-to-end encrypted video calls powered by Jitsi Meet
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
              <SignalIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Downloads</h3>
              <p className="text-gray-600 text-sm">
                Join directly from your browser — no apps or plugins required
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-lg border border-gray-100">
              <InformationCircleIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Records</h3>
              <p className="text-gray-600 text-sm">
                All session history is saved for your reference
              </p>
            </div>
          </div>

          {/* CTA for unauthenticated */}
          {!user && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white shadow-xl">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-blue-100 mb-6">
                Sign up to access video consultations with your healthcare provider.
              </p>
              <a
                href="/register"
                className="inline-block bg-white text-blue-600 font-semibold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                Sign Up as Patient
              </a>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TelemedicinePage;
