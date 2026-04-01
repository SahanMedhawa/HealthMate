import React, { useState } from "react";
import { Plus, Trash2, DollarSign, User, Hash, Receipt } from "lucide-react";

// Types and Interfaces
interface Service {
  name: string;
  cost: number | string;
  isCustom?: boolean;
}

interface ServiceOption {
  name: string;
  cost: number;
}

interface ReceiptData {
  receiptNo: string;
  patientId: string;
  patientName: string;
  services: Service[];
  total: number;
  createdBy: string;
  createdAt: string;
}

interface ReceiptFormProps {
  onSubmit: (data: ReceiptData) => void;
  onCancel: () => void;
  initialData?: ReceiptData;
}

// Predefined service list with costs
const serviceOptions: ServiceOption[] = [
  { name: "Consultation", cost: 2000 },
  { name: "Lab Test - Blood", cost: 1500 },
  { name: "Lab Test - Urine", cost: 1000 },
  { name: "X-Ray", cost: 3500 },
  { name: "ECG", cost: 2500 },
  { name: "Ultrasound", cost: 4000 },
  { name: "MRI Scan", cost: 15000 },
  { name: "CT Scan", cost: 12000 },
  { name: "Vaccination", cost: 800 },
  { name: "Physical Therapy", cost: 3000 },
  { name: "Dental Checkup", cost: 1800 },
  { name: "Eye Examination", cost: 1500 },
];

const ReceiptForm: React.FC<ReceiptFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [patientId, setPatientId] = useState<string>(initialData?.patientId || "");
  const [patientName, setPatientName] = useState<string>(initialData?.patientName || "");
  const [services, setServices] = useState<Service[]>(
    initialData && initialData.services && initialData.services.length > 0 
      ? initialData.services.map(s => ({ 
          name: s.name, 
          cost: s.cost, 
          isCustom: !serviceOptions.find(opt => opt.name === s.name) 
        }))
      : [{ name: "", cost: "", isCustom: false }]
  );

  const addService = (): void => {
    setServices([...services, { name: "", cost: "", isCustom: false }]);
  };

  const removeService = (index: number): void => {
    if (services.length > 1) {
      const updated = services.filter((_, i) => i !== index);
      setServices(updated);
    }
  };

  const handleServiceChange = (index: number, field: keyof Service, value: string): void => {
    const updated = [...services];
    
    if (field === "name") {
      if (value === "custom") {
        // Switch to custom mode
        updated[index].name = "";
        updated[index].cost = "";
        updated[index].isCustom = true;
      } else {
        // Predefined service selected
        const selectedService = serviceOptions.find(s => s.name === value);
        if (selectedService) {
          updated[index].name = selectedService.name;
          updated[index].cost = selectedService.cost;
          updated[index].isCustom = false;
        } else {
          updated[index].name = value;
        }
      }
    } else if (field === "cost") {
      updated[index].cost = value;
    }
    
    setServices(updated);
  };

  const calculateTotal = (): number =>
    services.reduce((sum, s) => sum + Number(s.cost || 0), 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const receiptNo = initialData?.receiptNo || "R-" + Math.floor(1000 + Math.random() * 9000);
    const total = calculateTotal();

    const receiptData: ReceiptData = {
      receiptNo,
      patientId,
      patientName,
      services,
      total,
      createdBy: "NujabaIrfan",
      createdAt: "2025-10-12 08:03:17",
    };

    onSubmit(receiptData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Receipt Number */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Receipt className="w-4 h-4 text-gray-500" />
          Receipt Number
        </label>
        <div className="relative">
          <input
            type="text"
            value={initialData?.receiptNo || "Auto-generated"}
            disabled
            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {initialData ? "Editing" : "Auto"}
            </span>
          </div>
        </div>
      </div>

      {/* Patient Information Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Patient Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-3 h-3 text-gray-500" />
              Patient ID
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientId(e.target.value)}
              required
              placeholder="Enter patient ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-3 h-3 text-gray-500" />
              Patient Name
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientName(e.target.value)}
              required
              placeholder="Enter patient name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Services & Charges
          </h3>
          <button
            type="button"
            onClick={addService}
            className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-all transform hover:scale-105"
          >
            <Plus className="w-3 h-3" />
            Add Service
          </button>
        </div>

        <div className="space-y-3">
          {services.map((s, index) => (
            <div
              key={index}
              className="flex gap-2 bg-white p-3 rounded-lg border border-emerald-200"
            >
              <div className="flex-1">
                {s.isCustom ? (
                  <input
                    type="text"
                    placeholder="Enter custom service name"
                    value={s.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const updated = [...services];
                      updated[index].name = e.target.value;
                      setServices(updated);
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                ) : (
                  <select
                    value={s.name}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                      handleServiceChange(index, "name", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="">Select a service</option>
                    {serviceOptions.map((option, i) => (
                      <option key={i} value={option.name}>
                        {option.name} - Rs. {option.cost.toLocaleString()}
                      </option>
                    ))}
                    <option value="custom" className="font-semibold text-blue-600">
                      ✏️ Enter Custom Service
                    </option>
                  </select>
                )}
              </div>
              <div className="w-32">
                <input
                  type="number"
                  placeholder="Cost"
                  value={s.cost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleServiceChange(index, "cost", e.target.value)
                  }
                  required
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm ${
                    s.isCustom ? 'bg-white' : 'bg-gray-50'
                  }`}
                  readOnly={!s.isCustom}
                />
              </div>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                  title="Remove service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-700">Total Amount</span>
          <span className="text-3xl font-bold text-purple-700">
            Rs. {calculateTotal().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          {initialData ? "Update Receipt" : "Save Receipt"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ReceiptForm;