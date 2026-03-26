import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

interface AppointmentFormData {
  patientId: string;
  patientName: string;
  patientAddress: string;
  patientContact: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  notes: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: any;
  selectedDate: string;
  selectedTime: string;
  rescheduleAppointmentId?: string | null;
  existingAppointment?: any;
  onSuccess: (appointment: any) => void;
}

const CreateAppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  doctor,
  selectedDate,
  selectedTime,
  rescheduleAppointmentId = null,
  existingAppointment = null,
  onSuccess
}) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: user?.id || '',
    patientName: user?.name || '',
    patientAddress: '',
    patientContact: '',
    doctorId: doctor?._id || '',
    doctorName: doctor?.fullName || '',
    date: selectedDate,
    time: selectedTime,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [originalAppointment, setOriginalAppointment] = useState<any>(null);

  // Set form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (rescheduleAppointmentId && existingAppointment) {
        // Use existing appointment data for rescheduling
        setOriginalAppointment(existingAppointment);
        setFormData({
          patientId: existingAppointment.patientId || user?.id || '',
          patientName: existingAppointment.patientName || user?.name || '',
          patientAddress: existingAppointment.patientAddress || '',
          patientContact: existingAppointment.patientContact || '',
          doctorId: existingAppointment.doctorId || doctor?._id || '',
          doctorName: existingAppointment.doctorName || doctor?.fullName || '',
          date: selectedDate, // Use the new selected date
          time: selectedTime, // Use the new selected time
          notes: existingAppointment.notes || ''
        });
      } else {
        // For new appointments, use default form data
        setFormData({
          patientId: user?.id || '',
          patientName: user?.name || '',
          patientAddress: '',
          patientContact: '',
          doctorId: doctor?._id || '',
          doctorName: doctor?.fullName || '',
          date: selectedDate,
          time: selectedTime,
          notes: ''
        });
      }
    }
  }, [isOpen, rescheduleAppointmentId, existingAppointment, user, doctor, selectedDate, selectedTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user?.id) {
      setError('You must be logged in to create an appointment');
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.patientName || !formData.patientAddress || !formData.patientContact) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      if (rescheduleAppointmentId) {
        // Handle rescheduling - update existing appointment
        console.log('Rescheduling appointment with data:', { ...formData, patientId: user.id, rescheduleAppointmentId });

        const response = await api.put(`/appointment/${rescheduleAppointmentId}`, {
          ...formData,
          patientId: user.id
        });
        const data = response.data;
        console.log('Appointment reschedule response:', data);

        if (data.success) {
          onSuccess(data.data);
          onClose();
        } else {
          setError(data.message || 'Failed to reschedule appointment');
        }
      } else {
        // Handle new appointment creation
        console.log('Creating appointment with data:', { ...formData, patientId: user.id });

        const response = await api.post(`/appointment`, {
          ...formData,
          patientId: user.id
        });
        const data = response.data;
        console.log('Appointment creation response:', data);

        if (data.success) {
          onSuccess(data.data);
          onClose();
        } else {
          setError(data.message || 'Failed to create appointment');
        }
      }
    } catch (error) {
      setError('Error creating/rescheduling appointment. Please try again.');
      console.error('Error creating/rescheduling appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {rescheduleAppointmentId ? 'Reschedule Appointment' : 'Book Appointment'}
              </h3>
              <p className="text-sm text-gray-600">
                {rescheduleAppointmentId
                  ? 'Update your appointment details and select a new time slot'
                  : 'Schedule your visit with our healthcare professionals'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}


            {/* Doctor Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Doctor: {doctor?.fullName}</h4>
              <p className="text-sm text-blue-700">New Date: {selectedDate} at {selectedTime}</p>
              {rescheduleAppointmentId && originalAppointment && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Previous:</span> {originalAppointment.date} at {originalAppointment.time}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient Name *</label>
                <input
                  name="patientName"
                  type="text"
                  required
                  value={formData.patientName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address *</label>
                <input
                  name="patientAddress"
                  type="text"
                  required
                  value={formData.patientAddress}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number *</label>
                <input
                  name="patientContact"
                  type="tel"
                  required
                  value={formData.patientContact}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Any additional information..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (rescheduleAppointmentId ? 'Reschedule' : 'Book')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAppointmentModal;
