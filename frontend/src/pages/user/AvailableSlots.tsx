import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addMinutes, addMonths, subMonths } from "date-fns";
import type { DoctorData } from "../../services/api";
import Navbar from "../../components/user/Navbar";
import Footer from "../../components/Footer";
import CreateAppointmentModal from "../../components/user/CreateAppointmentModal";
import api from "../../api/client";

function getSlotsForDay(
  availability: { date: string; startTime: string; endTime: string; slots: number }[],
  dateStr: string,
  bookedSlots: string[] = []
) {
  const avail = availability.find(a => {
    // Use UTC parsing to avoid timezone issues
    const date = new Date(a.date);
    const availDateStr = date.toISOString().split('T')[0];
    return availDateStr === dateStr;
  });
  if (!avail) return [];
  const slots = [];
  let start = new Date(`${dateStr}T${avail.startTime}`);
  const end = new Date(`${dateStr}T${avail.endTime}`);
  for (let i = 0; i < avail.slots; i++) {
    const slotTime = addMinutes(start, i * 30);
    if (slotTime >= end) break;
    const slotTimeStr = format(slotTime, "HH:mm");
    // Only include slots that are not booked
    if (!bookedSlots.includes(slotTimeStr)) {
      slots.push(slotTimeStr);
    }
  }
  return slots;
}

const AvailableSlots: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const doctor: DoctorData = location.state?.doctor;
  const rescheduleAppointmentId: string | null = location.state?.rescheduleAppointmentId || null;
  const existingAppointment: any = location.state?.existingAppointment || null;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookedAppointments, setBookedAppointments] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }))
  );
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Calendar days for current month with proper week alignment
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get the start of the week that contains the first day of the month
  const calendarStart = new Date(monthStart);
  const dayOfWeek = calendarStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  calendarStart.setDate(calendarStart.getDate() - dayOfWeek);

  // Get the end of the week that contains the last day of the month
  const calendarEnd = new Date(monthEnd);
  const lastDayOfWeek = calendarEnd.getDay();
  calendarEnd.setDate(calendarEnd.getDate() + (6 - lastDayOfWeek));

  // Build days array without relying on eachDayOfInterval to avoid type issues
  const days = useMemo(() => {
    const result: Date[] = [];
    const cur = new Date(calendarStart);
    while (cur <= calendarEnd) {
      result.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [calendarStart, calendarEnd]);

  // Fetch booked appointments for the doctor
  const fetchBookedAppointments = async () => {
    if (!doctor._id) return;

    setLoading(true);
    try {
      // Fetch appointments for all available dates
      const bookedByDate: { [key: string]: string[] } = {};

      for (const avail of doctor.availability) {
        const dateStr = new Date(avail.date).toISOString().split('T')[0];
        try {
          const response = await api.get(`/appointment/doctor/${doctor._id}/date/${dateStr}`);
          const data = response.data;

          if (data.success && data.appointments) {
            bookedByDate[dateStr] = data.appointments.map((appointment: any) => appointment.time);
          }
        } catch (error) {
          console.error(`Error fetching appointments for ${dateStr}:`, error);
        }
      }

      setBookedAppointments(bookedByDate);
    } catch (error) {
      console.error('Error fetching booked appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookedAppointments();
  }, [doctor._id, doctor.availability, refreshTrigger]);

  // Auto-refresh every 1 second (only when page is visible and no date is selected)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if the page is visible and no date is selected
      if (!document.hidden && !selectedDate) {
        setRefreshTrigger(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  // Refresh data when component becomes visible (e.g., returning from booking)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    const handleFocus = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    // Check if user is returning from booking page
    const handlePopState = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Get available dates from doctor's availability
  const availableDates = doctor.availability.map(a => {
    // Use UTC parsing to avoid timezone issues
    const date = new Date(a.date);
    return date.toISOString().split('T')[0];
  });

  // Get slots for selected day
  const slots = selectedDate ? getSlotsForDay(doctor.availability, selectedDate, bookedAppointments[selectedDate] || []) : [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Slots for {doctor.fullName}</h1>
          <div className="text-gray-600">{doctor.specialization} • {doctor.yearsOfExperience} years experience</div>
        </div>
        {/* Calendar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Available Dates</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Today
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Available</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center font-semibold text-gray-500 text-sm flex items-center justify-center h-12 w-12">{d}</div>
            ))}
            {days.map((day: Date) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isAvailable = availableDates.includes(dateStr);
              const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isCurrentYear = day.getFullYear() === currentMonth.getFullYear();
              const isInCurrentMonth = isCurrentMonth && isCurrentYear;

              return (
                <button
                  key={dateStr}
                  className={`rounded-lg text-sm font-medium border transition-all duration-200 h-12 w-12 flex items-center justify-center
                    ${!isInCurrentMonth
                      ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                      : isAvailable
                        ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-800 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }
                    ${selectedDate === dateStr ? "ring-2 ring-blue-500 shadow-lg scale-105" : ""}
                    ${isToday ? "ring-2 ring-green-400" : ""}
                  `}
                  onClick={() => isInCurrentMonth && setSelectedDate(dateStr)}
                  disabled={!isInCurrentMonth}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className={`text-sm font-semibold ${!isInCurrentMonth ? "text-gray-300" : ""}`}>
                      {day.getDate()}
                    </span>
                    {isToday && <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-0.5"></div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Date Picker for Any Date */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Or select any date:</label>
                <input
                  type="date"
                  value={selectedDate || ""}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className={`w-2 h-2 rounded-full ${selectedDate ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`}></div>
                <span>{selectedDate ? 'Auto-refresh paused' : 'Auto-refresh'}</span>
              </div>
            </div>
          </div>
          {selectedDate && (
            <div className="mt-4">
              <div className="font-semibold mb-2">Available Slots on {selectedDate}:</div>
              {loading ? (
                <div className="text-gray-500">Loading available slots...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.length === 0 ? (
                    <span className="text-gray-500">No slots available</span>
                  ) : (
                    slots.map(slot => (
                      <button
                        key={slot}
                        className={`px-4 py-2 rounded-lg border font-medium
                        ${selectedSlot === slot ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}
                      `}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 mt-4"
          disabled={!selectedDate || !selectedSlot}
          onClick={() => setShowAppointmentModal(true)}
        >
          {rescheduleAppointmentId ? "Reschedule Appointment" : "Book an Appointment"}
        </button>
      </main>

      {/* Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        doctor={doctor}
        selectedDate={selectedDate || ''}
        selectedTime={selectedSlot || ''}
        rescheduleAppointmentId={rescheduleAppointmentId}
        existingAppointment={existingAppointment}
        onSuccess={(appointment) => {
          console.log('Appointment created/rescheduled:', appointment);
          // Navigate to confirmation page
          navigate('/appointment/confirmation', {
            state: {
              appointment: appointment,
              doctor: doctor,
              isReschedule: !!rescheduleAppointmentId
            }
          });
        }}
      />

      <Footer />
    </div>
  );
};

export default AvailableSlots;