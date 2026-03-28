import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { format, startOfMonth, endOfMonth, addMinutes, addMonths, subMonths } from "date-fns";
import UpdateAvailability from "../../components/doctor/UpdateAvailability";

interface AvailabilitySlot {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
}

function getSlotsForDay(
  availability: AvailabilitySlot[],
  dateStr: string
) {
  // Handle both ISO string and YYYY-MM-DD string formats
  const avail = availability.find(a => {
    const availDate = a.date.includes('T') ? format(new Date(a.date), "yyyy-MM-dd") : a.date;
    return availDate === dateStr;
  });
  if (!avail) return [];
  const slots = [];
  let start = new Date(`${dateStr}T${avail.startTime}`);
  const end = new Date(`${dateStr}T${avail.endTime}`);
  for (let i = 0; i < avail.slots; i++) {
    const slotTime = addMinutes(start, i * 30);
    if (slotTime >= end) break;
    slots.push(format(slotTime, "HH:mm"));
  }
  return slots;
}

const DoctorAvailability: React.FC = () => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

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

  // Local helper to generate a date range by day to avoid date-fns dependency here
  const days = useMemo(() => {
    const result: Date[] = [];
    const cur = new Date(calendarStart);
    while (cur <= calendarEnd) {
      result.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [calendarStart, calendarEnd]);
  
  // Get available dates from doctor's availability - fix date comparison
  const availableDates = availability.map(a => {
    // Ensure we're comparing dates correctly
    const availDate = a.date.includes('T') ? format(new Date(a.date), "yyyy-MM-dd") : a.date;
    console.log("Processing date:", a.date, "->", availDate);
    return availDate;
  });
  
  console.log("Available dates:", availableDates);

  useEffect(() => {
    if (user?.id) {
      fetchAvailability();
    }
  }, [user?.id]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctors/${user?.id}`);
      if (response.data.success && response.data.doctor.availability) {
        console.log("Fetched availability:", response.data.doctor.availability);
        setAvailability(response.data.doctor.availability);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };


  // Get slots for selected day
  const slots = selectedDate ? getSlotsForDay(availability, selectedDate) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">My Availability</h1>
          <p className="text-lg text-gray-600">Manage your available time slots for patient appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            Update Availability
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4 text-lg">Loading availability...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
              {days.map(day => {
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
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
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
            </div>
          </div>

          {/* Selected Date Slots */}
          {selectedDate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Available Slots on {format(new Date(selectedDate), "EEEE, MMMM do, yyyy")}
                </h3>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {slots.length} slots
                </div>
              </div>
              
              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg">No slots available for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {slots.map(slot => (
                    <div
                      key={slot}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 text-center hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm"
                    >
                      <span className="text-sm font-semibold text-blue-800">{slot}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Availability Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Availability Summary</h3>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {availability.length} days configured
              </div>
            </div>
            
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No availability configured yet.</p>
                <p className="text-gray-400 text-sm mt-2">Use the "Update Availability" button in your dashboard to set your schedule.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availability.map((slot, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900">{slot.day}</span>
                      <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                        {format(new Date(slot.date + 'T00:00:00'), "MMM dd")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {slot.slots} slots available
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Availability Modal */}
      <UpdateAvailability
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        onUpdate={() => {
          // Refresh availability after update
          fetchAvailability();
        }}
      />
    </div>
  );
};

export default DoctorAvailability;
