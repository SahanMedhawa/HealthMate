import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface AppointmentData {
  _id: string;
  patientName: string;
  patientAddress: string;
  patientContact: string;
  doctorId: string | { name: string; specialization: string };
  doctorName?: string;
  date: string;
  time: string;
  queueNumber: number;
  status: string;
  notes?: string;
}

const AppointmentConfirmation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const appointment = location.state?.appointment as AppointmentData;

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-100">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">No appointment data found.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = format(new Date(appointment.date), 'MMMM d, yyyy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">Appointment Confirmed!</h1>
              <p className="text-blue-100">Your appointment has been successfully scheduled</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Doctor</p>
                <p className="font-semibold text-gray-900">
                  {typeof appointment.doctorId === 'object'
                    ? appointment.doctorId.name
                    : appointment.doctorName}
                </p>
                <p className="text-sm text-gray-600">
                  {typeof appointment.doctorId === 'object'
                    ? appointment.doctorId.specialization
                    : ''}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-gray-500">Queue Number</p>
                <p className="text-2xl font-bold text-blue-600">#{appointment.queueNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-semibold text-gray-900">{formattedDate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-semibold text-gray-900">{appointment.time}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-500">Patient</p>
              <p className="font-semibold text-gray-900">{appointment.patientName}</p>
              <p className="text-sm text-gray-600">{appointment.patientContact}</p>
              <p className="text-sm text-gray-600">{appointment.patientAddress}</p>
            </div>

            {appointment.notes && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{appointment.notes}</p>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Back to Home</span>
            </button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-500">
            <p>Please arrive 10 minutes before your scheduled time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentConfirmation;