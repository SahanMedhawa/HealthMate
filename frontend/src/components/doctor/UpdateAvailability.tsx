import React, { useState, useEffect } from "react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { format, addDays, parseISO } from "date-fns";

interface AvailabilitySlot {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
}

interface UpdateAvailabilityProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const UpdateAvailability: React.FC<UpdateAvailabilityProps> = ({ isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCurrentAvailability();
    }
  }, [isOpen, user?.id]);

  const fetchCurrentAvailability = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctors/${user?.id}`);
      if (response.data.success && response.data.doctor.availability) {
        setAvailability(response.data.doctor.availability);
      } else {
        // Initialize with next 7 days if no availability exists
        initializeDefaultAvailability();
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      initializeDefaultAvailability();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultAvailability = () => {
    // Start with empty availability - let users add dates as needed
    setAvailability([]);
  };

  const addNewSlot = () => {
    // Calculate default slots for 9:00 AM to 5:00 PM (8 hours = 16 slots)
    const defaultSlots = calculateSlots("09:00", "17:00");
    
    // Add a new slot with today's date as default, user can change it
    const today = new Date();
    
    setAvailability([...availability, {
      day: dayNames[today.getDay()],
      date: format(today, "yyyy-MM-dd"), // Use today's date as default
      startTime: "09:00",
      endTime: "17:00",
      slots: defaultSlots
    }]);
  };


  const removeSlot = (index: number) => {
    console.log("Removing slot at index:", index);
    const newAvailability = availability.filter((_, i) => i !== index);
    console.log("New availability after removal:", newAvailability);
    setAvailability(newAvailability);
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string | number) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate slots if startTime or endTime changed
    if (field === 'startTime' || field === 'endTime') {
      const slot = updated[index];
      if (slot.startTime && slot.endTime) {
        const slots = calculateSlots(slot.startTime, slot.endTime);
        updated[index] = { ...slot, slots };
      }
    }
    
    setAvailability(updated);
  };

  const calculateSlots = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;
    
    // Calculate slots (30 minutes per slot)
    return Math.max(0, Math.floor(durationMinutes / 30));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      console.log("Saving availability:", availability);
      console.log("User ID:", user.id);
      console.log("API URL:", `/doctors/${user.id}/profile`);
      
      const response = await api.patch(`/doctors/${user.id}/profile`, {
        availability: availability
      });
      
      console.log("Save response:", response.data);
      onUpdate();
      setShowSuccess(true);
    } catch (error: any) {
      console.error("Error updating availability:", error);
      console.error("Error response:", error.response?.data);
      setErrorMessage(error.response?.data?.message || error.message || "Failed to update availability");
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Update Availability</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your available time slots for appointments</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4 text-lg">Loading availability...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Availability Slots */}
              <div className="space-y-3">
                {availability.map((slot, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Slot #{index + 1}</h3>
                      <button
                        onClick={() => removeSlot(index)}
                        className="flex items-center px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="h-3 w-3 mr-1" />
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={slot.date.includes('T') ? format(parseISO(slot.date), "yyyy-MM-dd") : slot.date}
                          min={format(new Date(), "yyyy-MM-dd")} // Prevent selecting past dates
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            if (selectedDate) {
                              const newDate = new Date(selectedDate + 'T00:00:00');
                              // Update both date and day in a single operation
                              const updated = [...availability];
                              updated[index] = {
                                ...updated[index],
                                date: selectedDate,
                                day: dayNames[newDate.getDay()]
                              };
                              setAvailability(updated);
                            }
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Slots</label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="1"
                            value={slot.slots}
                            onChange={(e) => updateSlot(index, "slots", parseInt(e.target.value) || 1)}
                            className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-xs text-gray-500">
                            ({slot.slots * 30}m)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>


              {/* Add New Slot Button */}
              <button
                onClick={addNewSlot}
                className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-6 transition-all duration-200 flex items-center justify-center text-gray-600 hover:text-blue-600 group"
              >
                <PlusIcon className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-lg font-medium">Add Availability Slot</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {availability.length} slot{availability.length !== 1 ? 's' : ''} configured
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || availability.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center font-medium"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                "Save Availability"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal (nested) */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Availability updated</h3>
              <p className="text-sm text-gray-600 mb-6">Your availability has been saved successfully.</p>
              <button
                onClick={() => { setShowSuccess(false); onClose(); }}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal (nested) */}
      {showError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Update failed</h3>
              <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
              <button
                onClick={() => { setShowError(false); }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateAvailability;
