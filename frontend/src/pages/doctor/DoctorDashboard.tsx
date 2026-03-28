import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { format } from "date-fns";
import UpdateAvailability from "../../components/doctor/UpdateAvailability";

type Appointment = {
  _id: string;
  patientName: string;
  time: string;
  queueNumber: number;
  status: "booked" | "in_session" | "completed" | "cancelled";
};

// Payment breakdown structure
type PaymentBreakdown = {
  doctorFee: number;
  hospitalCharge: number;
  vat: number;
  total: number;
};

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [totalPatients, setTotalPatients] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [consultationFee, setConsultationFee] = useState<number>(0);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [showPriceSuccess, setShowPriceSuccess] = useState(false);
  const [priceInputError, setPriceInputError] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true); // Default to showing breakdown

  // Constants for fee calculation
  const VAT_RATE = 0.08; // 8% VAT
  const HOSPITAL_CHARGE_RATE = 0.10; // 10% hospital charge

  const QUICK_PRICES = [50, 75, 100, 150]; // USD values

  // Calculate payment breakdown
  const calculateBreakdown = (totalFee: number): PaymentBreakdown => {
    const doctorFee = totalFee / (1 + VAT_RATE + HOSPITAL_CHARGE_RATE);
    const hospitalCharge = doctorFee * HOSPITAL_CHARGE_RATE;
    const vat = doctorFee * VAT_RATE;
    const total = doctorFee + hospitalCharge + vat;
    
    return {
      doctorFee: Math.round(doctorFee),
      hospitalCharge: Math.round(hospitalCharge),
      vat: Math.round(vat),
      total: Math.round(total)
    };
  };

  const breakdown = calculateBreakdown(consultationFee);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const appointmentsRes = await api.get(`/appointment/doctor/${user.id}/date/${selectedDate}`);
      setAppointments(appointmentsRes.data.appointments || []);

      const allAppointmentsRes = await api.get(`/appointment/doctor/${user.id}`);
      const allAppointments = allAppointmentsRes.data.appointments || [];

      const uniquePatients = new Set(allAppointments.map((apt: any) => apt.patientName));
      setTotalPatients(uniquePatients.size);

      const pendingCount = allAppointments.filter((apt: any) =>
        apt.status === 'booked' && new Date(apt.date) <= new Date()
      ).length;
      setPendingReviews(pendingCount);

      const recentAppointments = allAppointments
        .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .slice(0, 3)
        .map((apt: any) => ({
          id: apt._id,
          type: apt.status === 'completed' ? 'completed' : apt.status === 'booked' ? 'scheduled' : 'updated',
          patientName: apt.patientName,
          time: format(new Date(apt.createdAt || apt.date), 'MMM dd, yyyy'),
          status: apt.status
        }));
      setRecentActivity(recentAppointments);

      // Fetch doctor's consultation fee (in USD)
      const doctorProfileRes = await api.get(`/doctors/${user.id}`);
      if (doctorProfileRes.data.success && doctorProfileRes.data.doctor) {
        const fee = doctorProfileRes.data.doctor.consultationFee || 0;
        setConsultationFee(fee);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setAppointments([]);
      setTotalPatients(0);
      setPendingReviews(0);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    setTempPrice(consultationFee.toString());
    setPriceInputError(false);
    setIsEditingPrice(true);
  };

  const handleCancelEdit = () => {
    setIsEditingPrice(false);
    setPriceInputError(false);
  };

  const handlePriceChange = (val: string) => {
    setTempPrice(val);
    setPriceInputError(false);
  };

  const handleUpdatePrice = async () => {
    if (!user?.id) return;

    const newPrice = parseFloat(tempPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      setPriceInputError(true);
      return;
    }

    setSavingPrice(true);
    try {
      // Store the total consultation fee in USD
      const response = await api.patch(`/doctors/${user.id}/consultation-fee`, {
        consultationFee: newPrice
      });

      if (response.data.success) {
        setConsultationFee(newPrice);
        setIsEditingPrice(false);
        setPriceInputError(false);
        setShowPriceSuccess(true);
        setTimeout(() => setShowPriceSuccess(false), 2500);
      } else {
        setPriceInputError(true);
      }
    } catch (error: any) {
      console.error("Error updating consultation fee:", error);
      setPriceInputError(true);
    } finally {
      setSavingPrice(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, user?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {user?.name}!
              </h2>
              <p className="text-blue-100 text-lg">
                Manage your appointments, patients, and medical practice from your dashboard.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
                <p className="text-xs text-green-600 font-medium">Live count</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900">{totalPatients}</p>
                <p className="text-xs text-blue-600 font-medium">Total patients</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-3xl font-bold text-gray-900">{pendingReviews}</p>
                <p className="text-xs text-yellow-600 font-medium">Needs attention</p>
              </div>
            </div>
          </div>

          {/* Consultation Fee Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">Consultation Fee</p>

                {/* Price display row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-gray-900">
                    ${consultationFee.toLocaleString()}
                  </span>
                  {!isEditingPrice && (
                    <button
                      onClick={handleOpenEdit}
                      className="text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-full transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {showPriceSuccess && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full animate-pulse">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-0.5">Per consultation (USD)</p>

                {/* Inline edit panel */}
                {isEditingPrice && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {/* Input */}
                    <div className="relative mb-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
                        USD
                      </span>
                      <input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdatePrice()}
                        className={`w-full pl-12 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          priceInputError
                            ? "border-red-400 focus:ring-red-200 bg-red-50"
                            : "border-gray-300 focus:ring-purple-200 focus:border-purple-400"
                        }`}
                        placeholder="Enter amount in USD"
                        min="0"
                        step="10"
                        autoFocus
                      />
                      {priceInputError && (
                        <p className="text-xs text-red-500 mt-1">Please enter a valid price in USD.</p>
                      )}
                    </div>

                    {/* Quick-set chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {QUICK_PRICES.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePriceChange(p.toString())}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            tempPrice === p.toString()
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                          }`}
                        >
                          ${p}
                        </button>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdatePrice}
                        disabled={savingPrice}
                        className="flex-1 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingPrice ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Saving…
                          </span>
                        ) : "Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Breakdown Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Breakdown Structure</h3>
            </div>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              {showBreakdown ? (
                <>
                  Hide Details
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              ) : (
                <>
                  Show Details
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {showBreakdown && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Doctor's Fee</span>
                    <div className="p-1 bg-green-100 rounded">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${breakdown.doctorFee.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Received by doctor</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Hospital Charge</span>
                    <div className="p-1 bg-blue-100 rounded">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${breakdown.hospitalCharge.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">10% of doctor's fee</p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">VAT (Value Added Tax)</span>
                    <div className="p-1 bg-yellow-100 rounded">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${breakdown.vat.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">8% of doctor's fee</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">Total Patient Payment</p>
                    <p className="text-xs text-purple-700 mt-1">Complete breakdown of consultation charges</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-purple-900">${breakdown.total.toLocaleString()}</p>
                    <p className="text-xs text-purple-700">USD per consultation</p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs">
                    <strong>Calculation Method:</strong> The total consultation fee is distributed as follows:
                    Doctor's Fee + Hospital Charge (10% of doctor's fee) + VAT (8% of doctor's fee). 
                    The consultation fee you set above represents the total amount patients pay.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <button className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all duration-200 group">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700">View Patient Records</span>
                    <p className="text-xs text-gray-500">Access patient medical history</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowAvailabilityModal(true)}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 group"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-700">Update Availability</span>
                    <p className="text-xs text-gray-500">Manage your schedule and time slots</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className={`flex items-start space-x-3 p-3 rounded-xl border ${
                    activity.type === 'completed' ? 'bg-green-50 border-green-200' :
                    activity.type === 'scheduled' ? 'bg-blue-50 border-blue-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      activity.type === 'completed' ? 'bg-green-500' :
                      activity.type === 'scheduled' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === 'completed' ? `Appointment with ${activity.patientName} completed` :
                         activity.type === 'scheduled' ? `New appointment with ${activity.patientName} scheduled` :
                         `Appointment with ${activity.patientName} updated`}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Next Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 md:mb-0">Next Appointments</h3>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Filter by date:</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors font-medium"
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd"))}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors font-medium"
                >
                  Tomorrow
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-3 text-sm">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No appointments scheduled for {format(new Date(selectedDate), "EEEE, MMMM do, yyyy")}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.slice(0, 5).map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-sm font-bold text-white">
                        {appointment.patientName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{appointment.patientName}</p>
                      <p className="text-xs text-gray-500">Queue #{appointment.queueNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{appointment.time}</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      appointment.status === "in_session"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : appointment.status === "completed"
                        ? "bg-gray-100 text-gray-800 border border-gray-200"
                        : appointment.status === "booked"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      {appointment.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}

              {appointments.length > 5 && (
                <div className="mt-6 text-center">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
                    View All {appointments.length} Appointments →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Update Availability Modal */}
      <UpdateAvailability
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        onUpdate={() => {
          console.log("Availability updated");
        }}
      />
    </div>
  );
};

export default DoctorDashboard;