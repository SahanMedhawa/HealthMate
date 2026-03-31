import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/user/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/client';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  XMarkIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ReceiptPercentIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

// Add modal state and selected appointment
interface ModalState {
  isOpen: boolean;
  type: 'reschedule' | 'cancel' | 'payment' | null;
  appointmentId: string | null;
}

interface FeeBreakdown {
  doctorFee: number;
  hospitalCharge: number;
  vat: number;
  totalFee: number;
}

interface Appointment {
  _id: string;
  queueNumber: number;
  doctorName: string;
  doctorId: string;
  date: string;
  time: string;
  status: 'booked' | 'in_session' | 'completed' | 'cancelled';
  notes?: string;
  consultationFee?: number;
  paymentStatus?: 'pending' | 'paid' | 'failed';
}

const MyAppointments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    appointmentId: null
  });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      // Wait for user to be loaded from localStorage
      if (user === null) {
        // Still loading user from localStorage
        return;
      }

      if (!user?.id) {
        setError('Please log in to view your appointments');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/appointment/patient/${user.id}`);
        const data = response.data;

        if (!data.success) {
          setError(data.message || 'Failed to fetch appointments');
          setAppointments([]);
        } else {
          // Sort appointments by date (oldest first) and then by time
          const sortedAppointments = (data.data || []).sort((a: Appointment, b: Appointment) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            // First sort by date (oldest first)
            if (dateA.getTime() !== dateB.getTime()) {
              return dateA.getTime() - dateB.getTime();
            }

            // If same date, sort by time (earliest first)
            return a.time.localeCompare(b.time);
          });

          console.log('Fetched appointments:', sortedAppointments);
          console.log('First appointment doctorId:', sortedAppointments[0]?.doctorId);
          setAppointments(sortedAppointments);
        }
      } catch (error: any) {
        console.error('Error fetching appointments:', error);
        setError(error.message || 'Failed to fetch appointments. Please try again later.');
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  const calculateFeeBreakdown = (totalFee: number): FeeBreakdown => {
    // Calculations:
    // Total Fee = Doctor's Fee + Hospital Charge + VAT
    // Doctor's Fee = Total Fee / 1.18
    // Hospital Charge = (Total Fee * 0.1) / 1.18
    // VAT = (Total Fee * 0.08) / 1.18
    
    const doctorFee = totalFee / 1.18;
    const hospitalCharge = (totalFee * 0.1) / 1.18;
    const vat = (totalFee * 0.08) / 1.18;
    
    return {
      doctorFee: Math.round(doctorFee * 100) / 100,
      hospitalCharge: Math.round(hospitalCharge * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      totalFee: totalFee
    };
  };

  const handlePaymentClick = (appointment: Appointment) => {
    if (!appointment.consultationFee) {
      console.error('No consultation fee found');
      return;
    }
    
    const breakdown = calculateFeeBreakdown(appointment.consultationFee);
    setFeeBreakdown(breakdown);
    setSelectedAppointment(appointment);
    setModal({
      isOpen: true,
      type: 'payment',
      appointmentId: appointment._id
    });
  };

  const handleProceedToPay = async () => {
    if (!selectedAppointment || !feeBreakdown) return;

    try {
      // Here you would integrate with your payment gateway
      // For example, redirect to payment page or open payment modal
      console.log('Processing payment for appointment:', selectedAppointment._id);
      console.log('Amount:', feeBreakdown.totalFee);
      
      // Example: Redirect to payment page with appointment details
      navigate('/payment', {
        state: {
          appointmentId: selectedAppointment._id,
          amount: feeBreakdown.totalFee,
          appointmentDetails: selectedAppointment,
          feeBreakdown: feeBreakdown
        }
      });
      
      // Close the modal
      setModal({ isOpen: false, type: null, appointmentId: null });
      setSelectedAppointment(null);
      setFeeBreakdown(null);
    } catch (error) {
      console.error('Error initiating payment:', error);
    }
  };

  const handleReschedule = async () => {
    if (!modal.appointmentId) return;

    try {
      // Find the appointment to get the doctor ID
      const appointment = appointments.find(apt => apt._id === modal.appointmentId);
      if (!appointment) {
        console.error('Appointment not found');
        setModal({ isOpen: false, type: null, appointmentId: null });
        return;
      }

      console.log('Found appointment:', appointment);
      console.log('Appointment doctorId:', appointment.doctorId);

      // Fetch doctor details
      console.log('Fetching doctor details for ID:', appointment.doctorId);
      const response = await api.get(`/doctors/${appointment.doctorId}`);
      const data = response.data;
      console.log('Doctor API response data:', data);

      if (data.success && data.doctor) {
        const doctor = data.doctor;
        // Navigate to the specific doctor's slots page with doctor data for rescheduling
        setModal({ isOpen: false, type: null, appointmentId: null });
        navigate(`/doctors/${appointment.doctorId}/slots`, {
          state: {
            doctor: doctor,
            rescheduleAppointmentId: modal.appointmentId,
            existingAppointment: appointment // Pass the existing appointment data
          }
        });
      } else {
        console.error('Failed to fetch doctor details:', data);
        setModal({ isOpen: false, type: null, appointmentId: null });
      }
    } catch (error) {
      console.error('Error navigating to reschedule:', error);
      setModal({ isOpen: false, type: null, appointmentId: null });
    }
  };

  const handleCancel = async () => {
    if (!modal.appointmentId) return;

    try {
      const response = await api.delete(`/appointment/${modal.appointmentId}`);
      const data = response.data;

      if (data.success) {
        // Close modal and refresh appointments
        setModal({ isOpen: false, type: null, appointmentId: null });
        window.location.reload();
      } else {
        console.error('Failed to cancel appointment:', data.message);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  // Add this JSX for the modal
  const Modal = () => {
    if (!modal.isOpen) return null;

    // Payment Modal
    if (modal.type === 'payment' && selectedAppointment && feeBreakdown) {
      return (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full mx-auto shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6">
              <h3 className="text-2xl font-bold text-white">Payment Details</h3>
              <p className="text-green-100 mt-1">Appointment #{selectedAppointment.queueNumber}</p>
            </div>
            
            <div className="p-6">
              {/* Appointment Summary */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Appointment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doctor:</span>
                    <span className="font-medium text-gray-900">{selectedAppointment.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {format(new Date(selectedAppointment.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">{selectedAppointment.time}</span>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Fee Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-5 w-5 text-blue-500" />
                      <span className="text-gray-700">Doctor's Fee</span>
                    </div>
                    <span className="font-medium text-gray-900">${feeBreakdown.doctorFee.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <BuildingOfficeIcon className="h-5 w-5 text-purple-500" />
                      <span className="text-gray-700">Hospital Charge (10%)</span>
                    </div>
                    <span className="font-medium text-gray-900">${feeBreakdown.hospitalCharge.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <ReceiptPercentIcon className="h-5 w-5 text-orange-500" />
                      <span className="text-gray-700">VAT (8%)</span>
                    </div>
                    <span className="font-medium text-gray-900">${feeBreakdown.vat.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Total Amount */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount to Pay</p>
                    <p className="text-2xl font-bold text-green-600">${feeBreakdown.totalFee.toLocaleString()}</p>
                  </div>
                  <CurrencyDollarIcon className="h-10 w-10 text-green-500 opacity-50" />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Payment Methods Accepted:</p>
                <div className="flex space-x-3">
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">💳 Credit Card</div>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">🏦 Net Banking</div>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">📱 UPI</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setModal({ isOpen: false, type: null, appointmentId: null });
                    setSelectedAppointment(null);
                    setFeeBreakdown(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToPay}
                  className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center space-x-2"
                >
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Proceed to Pay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Reschedule/Cancel Modal
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white/90 backdrop-filter backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {modal.type === 'reschedule'
              ? 'Reschedule Appointment'
              : 'Cancel Appointment'}
          </h3>
          <p className="text-gray-600 mb-6">
            {modal.type === 'reschedule'
              ? 'You will be redirected to book a new appointment. Your current appointment will remain active until you book a new one.'
              : 'Your appointment will be cancelled. This action cannot be undone.'}
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setModal({ isOpen: false, type: null, appointmentId: null })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              No, Keep it
            </button>
            <button
              onClick={modal.type === 'reschedule' ? handleReschedule : handleCancel}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${modal.type === 'reschedule'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              Yes, {modal.type === 'reschedule' ? 'Reschedule' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'booked': return <ClockIcon className="h-5 w-5" />;
      case 'in_session': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'completed': return <CheckCircleIcon className="h-5 w-5" />;
      case 'cancelled': return <XCircleIcon className="h-5 w-5" />;
      default: return <ClockIcon className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'booked': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_session': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPaymentStatusBadge = (paymentStatus?: string) => {
    if (paymentStatus === 'paid') {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs">
          <CheckCircleIcon className="h-3 w-3" />
          <span>Paid</span>
        </div>
      );
    } else if (paymentStatus === 'failed') {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs">
          <XCircleIcon className="h-3 w-3" />
          <span>Payment Failed</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
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
              My <span className="text-blue-600">Appointments</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Manage your healthcare appointments, track your queue status, and stay updated with real-time notifications
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Stats Cards */}
        {appointments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'booked').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Session</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'in_session').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointments List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading your appointments...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Appointments</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-6 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 max-w-md mx-auto">
              <CalendarDaysIcon className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Appointments Yet</h3>
              <p className="text-gray-600 mb-8">Book your first appointment to get started with your healthcare journey.</p>
              <button
                onClick={() => window.location.href = '/doctorsdir'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-medium flex items-center mx-auto"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Book an Appointment
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Appointments */}
            {appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Appointments</h2>

                <div className="grid gap-4">
                  {appointments
                    .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
                    .map((appointment) => (
                      <div key={appointment._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start space-x-4">
                              {/* Queue Number Badge */}
                              <div className="flex-shrink-0">
                                <div className="bg-blue-100 text-blue-800 text-lg font-bold rounded-xl px-4 py-2 min-w-[60px] text-center">
                                  #{appointment.queueNumber}
                                </div>
                              </div>

                              {/* Appointment Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <UserIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    <h3 className="text-xl font-semibold text-gray-900">{appointment.doctorName}</h3>
                                  </div>
                                  {getPaymentStatusBadge(appointment.paymentStatus)}
                                </div>

                                <div className="space-y-3 mb-4">
                                  <div className="flex items-start space-x-3">
                                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="text-sm text-gray-600">Date</p>
                                      <p className="font-medium text-gray-900 text-left">
                                        {format(new Date(appointment.date), 'EEEE, MMM dd, yyyy')}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start space-x-3">
                                    <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="text-sm text-gray-600">Time</p>
                                      <p className="font-medium text-gray-900 text-left">{appointment.time}</p>
                                    </div>
                                  </div>

                                  {/* Consultation Fee */}
                                  <div className="flex items-start space-x-3">
                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                      <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="text-sm text-gray-600">Consultation Fee</p>
                                      <p className="font-semibold text-gray-900">
                                        ${appointment.consultationFee?.toLocaleString() || '0'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {appointment.notes && (
                                  <div className="flex items-start space-x-3">
                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="text-sm text-gray-600">Notes</p>
                                      <p className="text-gray-900 break-words text-left">{appointment.notes}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex flex-col items-start lg:items-end space-y-4 lg:min-w-[200px]">
                            {/* Status Badge */}
                            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm ${getStatusColor(appointment.status)}`}>
                              {getStatusIcon(appointment.status)}
                              <span className="font-medium capitalize text-sm">
                                {appointment.status.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            {appointment.status === 'booked' && (
                              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                {appointment.paymentStatus !== 'paid' && (
                                  <button
                                    onClick={() => handlePaymentClick(appointment)}
                                    className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto font-medium"
                                  >
                                    <CreditCardIcon className="h-4 w-4" />
                                    <span>Pay Now</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setModal({
                                    isOpen: true,
                                    type: 'reschedule',
                                    appointmentId: appointment._id
                                  })}
                                  className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto font-medium"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                  <span>Reschedule</span>
                                </button>
                                <button
                                  onClick={() => setModal({
                                    isOpen: true,
                                    type: 'cancel',
                                    appointmentId: appointment._id
                                  })}
                                  className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto font-medium"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Completed Appointments History */}
            {appointments.filter(a => a.status === 'completed' || a.status === 'cancelled').length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Appointment History</h2>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-green-50 to-teal-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Queue #
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Doctor
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Fee
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Payment
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {appointments
                          .filter(a => a.status === 'completed' || a.status === 'cancelled')
                          .map((appointment) => (
                            <tr key={appointment._id} className="hover:bg-gray-50 transition-colors duration-200">
                              {/* Queue Number */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="bg-green-100 text-green-800 text-sm font-bold rounded-lg px-3 py-1 text-center inline-block">
                                  #{appointment.queueNumber}
                                </div>
                              </td>

                              {/* Doctor */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div className="p-1.5 bg-green-100 rounded-lg">
                                    <UserIcon className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900">{appointment.doctorName}</div>
                                </div>
                              </td>

                              {/* Date & Time */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <CalendarDaysIcon className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs font-medium text-gray-900">
                                      {format(new Date(appointment.date), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <ClockIcon className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600">{appointment.time}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Consultation Fee */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-green-600">
                                  ${appointment.consultationFee?.toLocaleString() || '0'}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg border ${getStatusColor(appointment.status)}`}>
                                  {getStatusIcon(appointment.status)}
                                  <span className="font-medium capitalize text-xs">
                                    {appointment.status.replace('_', ' ')}
                                  </span>
                                </div>
                              </td>

                              {/* Payment Status */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                {getPaymentStatusBadge(appointment.paymentStatus) || (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>

                              {/* Notes */}
                              <td className="px-4 py-4">
                                <div className="max-w-xs">
                                  {appointment.notes ? (
                                    <div className="flex items-start space-x-1">
                                      <DocumentTextIcon className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-gray-900 truncate" title={appointment.notes}>
                                        {appointment.notes}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      <Modal />
    </div>
  );
};

export default MyAppointments;