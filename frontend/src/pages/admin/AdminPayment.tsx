import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminRoute from "../../components/admin/AdminRoute";
import ReceiptForm from "../../components/recieptForm";
import { 
  Plus, 
  Receipt, 
  Search, 
  X, 
  DollarSign, 
  User, 
  FileText, 
  Edit, 
  Trash2, 
  Shield,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Lock,
  CreditCard as PaymentIcon
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Types and Interfaces
interface Service {
  name: string;
  cost: number;
  isCustom?: boolean;
}

interface Receipt {
  _id: string;
  receiptNo: string;
  patientId: string;
  patientName: string;
  services: Service[];
  total: number;
  status: 'Paid' | 'Pending' | 'Claim Pending' | 'Funding Pending' | 'Overdue';
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

interface Appointment {
  _id: string;
  patientId: string;
  patientName: string;
  patientContact: string;
  patientAddress: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'booked' | 'in_session' | 'completed' | 'cancelled';
  queueNumber: number;
  notes?: string;
  consultationFee: number;
  createdAt: string;
  paymentTransactionId?: string;
}

// Updated to match your actual GovernmentFunding schema
interface GovernmentFunding {
  _id: string;
  billId: string;
  receiptNo: string;
  amount: number;
  programType: string;
  beneficiaryId: string;
  beneficiaryName: string;
  referenceNumber?: string;
  status: 'submitted' | 'approved' | 'rejected' | 'processing';
  createdAt: string;
  updatedAt: string;
}

interface InsuranceClaim {
  _id: string;
  billId: string;
  receiptNo: string;
  claimantId: string;
  claimantName: string;
  insuranceProvider: string;
  policyNumber: string;
  amount: number;
  status: 'submitted' | 'approved' | 'rejected' | 'processing';
  createdAt: string;
  updatedAt?: string;
}

interface TransactionItem {
  _id: string;
  type: 'receipt' | 'insurance' | 'government';
  receiptNo?: string;
  billId?: string;
  patientName?: string;
  claimantName?: string;
  beneficiaryName?: string;
  amount: number;
  status: string;
  createdAt: string;
  rawData: Receipt | InsuranceClaim | GovernmentFunding;
}

interface Stats {
  totalReceipts: number;
  totalPatients: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  claimsAmount: number;
  fundingAmount: number;
}

type TabType = 'all' | 'paid' | 'pending' | 'claims' | 'funding';

const BASE_URL = "http://localhost:5008";
const APPOINTMENT_BASE_URL = "http://localhost:5003";

const AdminPayment: React.FC = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>("all");
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>([]);
  const [governmentFunding, setGovernmentFunding] = useState<GovernmentFunding[]>([]);
  const [showPaymentDetails, setShowPaymentDetails] = useState<Receipt | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedReceiptForPayment, setSelectedReceiptForPayment] = useState<Receipt | null>(null);
  const [showAppointmentPaymentModal, setShowAppointmentPaymentModal] = useState<boolean>(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [receiptsRes, appointmentsRes, claimsRes, fundingRes] = await Promise.all([
        axios.get<Receipt[]>(`${BASE_URL}/api/receipts`),
        axios.get<{ success: boolean; data: Appointment[] }>(`${APPOINTMENT_BASE_URL}/api/appointment/`),
        axios.get<InsuranceClaim[]>(`${BASE_URL}/api/admin/insurance-claims`),
        axios.get<GovernmentFunding[]>(`${BASE_URL}/api/admin/government-funding`)
      ]);
      
      console.log("Government Funding Data:", fundingRes.data);
      
      setReceipts(receiptsRes.data || []);
      setAppointments(appointmentsRes.data?.data || []);
      setInsuranceClaims(claimsRes.data || []);
      setGovernmentFunding(fundingRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReceipt = async (formData: any): Promise<void> => {
    try {
      const newReceipt: Omit<Receipt, '_id'> = {
        ...formData,
        status: 'Pending'
      };
      const res = await axios.post<Receipt>(`${BASE_URL}/api/receipts`, newReceipt);
      setReceipts([...receipts, res.data]);
      setShowModal(false);
      fetchAllData();
    } catch (err: any) {
      console.error("Error saving receipt:", err);
      
      // Extract specific error message from API response
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error?.message ||
                          "Failed to save receipt. Please check the backend connection.";
      
      const errorDetails = err.response?.data?.errors?.join(", ") || 
                          err.response?.data?.error || "";
      
      const fullMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
      
      alert(fullMessage);
      setError(fullMessage);
    }
  };

  const handleEditReceipt = async (formData: any): Promise<void> => {
    if (editingReceipt?.status === "Paid") {
      alert("Cannot edit a paid receipt. Please change the status to 'Pending' first.");
      return;
    }

    try {
      const updatedReceipt = {
        ...formData,
        status: editingReceipt?.status || 'Pending'
      };
      const res = await axios.put<Receipt>(`${BASE_URL}/api/receipts/${editingReceipt?._id}`, updatedReceipt);
      setReceipts(receipts.map((r) => (r._id === editingReceipt?._id ? res.data : r)));
      setShowModal(false);
      setEditingReceipt(null);
      fetchAllData();
    } catch (err: any) {
      console.error("Error updating receipt:", err);
      
      // Extract specific error message from API response
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error?.message ||
                          "Failed to update receipt. Please check the backend connection.";
      
      const errorDetails = err.response?.data?.errors?.join(", ") || 
                          err.response?.data?.error || "";
      
      const fullMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
      
      alert(fullMessage);
      setError(fullMessage);
    }
  };

  const handleDeleteReceipt = async (id: string): Promise<void> => {
    const receipt = receipts.find(r => r._id === id);
    
    if (receipt?.status === "Paid") {
      alert("Cannot delete a paid receipt. Please change the status to 'Pending' first.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await axios.delete(`${BASE_URL}/api/receipts/${id}`);
        setReceipts(receipts.filter((r) => r._id !== id));
        fetchAllData();
      } catch (err) {
        console.error("Error deleting receipt:", err);
        alert("Failed to delete receipt. Please check the backend connection.");
      }
    }
  };



  const updatePaymentStatus = async (receiptId: string, status: Receipt['status']): Promise<void> => {
    try {
      await axios.put(`${BASE_URL}/api/receipts/${receiptId}`, { status });
      fetchAllData();
      setShowPaymentModal(false);
      setSelectedReceiptForPayment(null);
      setShowPaymentDetails(null);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  };

  const handleAppointmentPayment = async (appointment: Appointment, paymentStatus: Receipt['status']): Promise<void> => {
    try {
      // Validate appointment data
      if (!appointment.patientId || !appointment.patientName || !appointment.doctorName) {
        alert("Invalid appointment data. Please refresh and try again.");
        return;
      }

      const consultationFee = Number(appointment.consultationFee) || 0;
      if (consultationFee <= 0) {
        alert("Invalid consultation fee. Please check the appointment details.");
        return;
      }

      // Create services array
      const services = [
        {
          name: `Consultation - Dr. ${appointment.doctorName}`,
          cost: consultationFee
        }
      ];

      // Validate services
      if (!services || services.length === 0) {
        alert("No services to add. Please check the appointment details.");
        return;
      }

      // Create a receipt for the appointment
      const receiptData = {
        receiptNo: `APT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        patientId: String(appointment.patientId),
        patientName: String(appointment.patientName),
        services: services,
        total: consultationFee,
        status: paymentStatus,
        paymentStatus: paymentStatus === 'Paid' ? 'paid' : 'unpaid',
        createdBy: "admin",
        appointmentId: String(appointment._id)
      };

      console.log("Creating receipt with data:", receiptData);
      
      const response = await axios.post(`${BASE_URL}/api/receipts`, receiptData);
      
      if (response.status === 201 || response.status === 200) {
        const receiptId = response.data._id;
        console.log("Receipt created with ID:", receiptId);
        
        // Update appointment with paymentTransactionId
        try {
          await axios.patch(`${APPOINTMENT_BASE_URL}/api/appointment/${appointment._id}/payment-status`, {
            paymentTransactionId: receiptId
          });
          console.log("Appointment updated with paymentTransactionId:", receiptId);
        } catch (appointmentErr: any) {
          console.warn("Warning: Could not link receipt to appointment:", appointmentErr.message);
          // Don't fail the whole operation if appointment linking fails
        }
        
        alert(`Receipt created successfully with status: ${paymentStatus}`);
        fetchAllData();
        setShowAppointmentPaymentModal(false);
        setSelectedAppointmentForPayment(null);
      }
    } catch (err: any) {
      console.error("Error handling appointment payment:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0] || err.message || "Unknown error";
      alert(`Failed to process appointment payment: ${errorMessage}`);
    }
  };

  const updateClaimStatus = async (claimId: string, status: string, type: 'insurance' | 'government' = 'insurance'): Promise<void> => {
    try {
      const endpoint = type === 'insurance' 
        ? `${BASE_URL}/api/admin/insurance-claims/${claimId}`
        : `${BASE_URL}/api/admin/government-funding/${claimId}`;
      
      await axios.put(endpoint, { status });
      fetchAllData();
      alert(`Successfully ${status === 'approved' ? 'approved' : 'rejected'} the ${type === 'insurance' ? 'claim' : 'funding'}`);
    } catch (err) {
      console.error("Error updating claim status:", err);
      alert("Failed to update status. Please check if the backend endpoint is implemented.");
    }
  };

  const openEditModal = (receipt: Receipt): void => {
    if (receipt.status === "Paid") {
      alert("Cannot edit a paid receipt. Please change the status to 'Pending' first.");
      return;
    }
    setEditingReceipt(receipt);
    setShowModal(true);
  };

  const openPaymentModal = (receipt: Receipt): void => {
    setSelectedReceiptForPayment(receipt);
    setShowPaymentModal(true);
  };

  const getStatusBadge = (status: Receipt['status']): React.ReactElement => {
    const statusConfig: Record<Receipt['status'], { color: string; icon: React.ComponentType<{ className?: string }> }> = {
      'Paid': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Claim Pending': { color: 'bg-blue-100 text-blue-800', icon: Shield },
      'Funding Pending': { color: 'bg-purple-100 text-purple-800', icon: Building2 },
      'Overdue': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getFundingStatusBadge = (status: string): React.ReactElement => {
    const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
      'submitted': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'processing': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'approved': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'rejected': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig['submitted'];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Create combined transaction items from all three sources
  const createCombinedTransactions = (): TransactionItem[] => {
    const transactions: TransactionItem[] = [];

    // Add receipts
    receipts.forEach(r => {
      transactions.push({
        _id: r._id,
        type: 'receipt',
        receiptNo: r.receiptNo,
        patientName: r.patientName,
        amount: r.total || 0,
        status: r.status,
        createdAt: r.createdAt,
        rawData: r
      });
    });

    // Add insurance claims
    insuranceClaims.forEach(ic => {
      transactions.push({
        _id: ic._id,
        type: 'insurance',
        receiptNo: ic.receiptNo,
        billId: ic.billId,
        claimantName: ic.claimantName,
        amount: ic.amount,
        status: ic.status,
        createdAt: ic.createdAt,
        rawData: ic
      });
    });

    // Add government funding
    governmentFunding.forEach(gf => {
      transactions.push({
        _id: gf._id,
        type: 'government',
        receiptNo: gf.receiptNo,
        billId: gf.billId,
        beneficiaryName: gf.beneficiaryName,
        amount: gf.amount,
        status: gf.status,
        createdAt: gf.createdAt,
        rawData: gf
      });
    });

    return transactions;
  };

  // Filter combined transactions based on selected tab
  const filteredCombinedTransactions: TransactionItem[] = createCombinedTransactions().filter((t) => {
    const matchesSearch = 
      t.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.claimantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedTab === "all") return matchesSearch;
    if (selectedTab === "paid") {
      if (t.type === 'receipt') return matchesSearch && t.status === "Paid";
      if (t.type === 'insurance') return matchesSearch && t.status === "approved";
      if (t.type === 'government') return matchesSearch && t.status === "approved";
      return false;
    }
    if (selectedTab === "pending") {
      if (t.type === 'receipt') return matchesSearch && t.status === "Pending";
      if (t.type === 'insurance') return matchesSearch && (t.status === "submitted" || t.status === "processing");
      if (t.type === 'government') return matchesSearch && (t.status === "submitted" || t.status === "processing");
      return false;
    }
    
    return false;
  });



  // Filter government funding based on search
  const filteredFunding: GovernmentFunding[] = governmentFunding.filter((f) => {
    const matchesSearch = 
      f.billId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.beneficiaryId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Get unpaid appointments
  const unpaidAppointments: Appointment[] = appointments.filter((appt) => {
    const hasPaymentTransaction = !!appt.paymentTransactionId;
    
    const matchesSearch = 
      appt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return !hasPaymentTransaction && matchesSearch && appt.status !== "cancelled";
  });

  const stats: Stats = {
    totalReceipts: receipts.length,
    totalPatients: new Set(receipts.map((r) => r.patientName)).size,
    totalRevenue: receipts.reduce((sum, r) => sum + (r.total || 0), 0),
    paidAmount: receipts.filter(r => r.status === 'Paid').reduce((sum, r) => sum + (r.total || 0), 0),
    pendingAmount: receipts.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (r.total || 0), 0),
    claimsAmount: receipts.filter(r => r.status === 'Claim Pending').reduce((sum, r) => sum + (r.total || 0), 0),
    fundingAmount: receipts.filter(r => r.status === 'Funding Pending').reduce((sum, r) => sum + (r.total || 0), 0),
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading payment data...</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-100">
        <div className="flex h-screen overflow-hidden">
          <AdminSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isMobile={isMobile}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <AdminHeader
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
              <div className="container mx-auto px-6 py-8 max-w-7xl">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <p className="text-red-700">{error}</p>
                      <button
                        onClick={fetchAllData}
                        className="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Page Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-3 rounded-xl">
                        <Receipt className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-800">Payment Management</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage receipts, payments, and claims</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingReceipt(null);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Plus className="w-5 h-5" />
                      New Receipt
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Receipts</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalReceipts}</p>
                      </div>
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Patients</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalPatients}</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">
                          $ {stats.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Paid Amount</p>
                        <p className="text-3xl font-bold text-gray-800 mt-1">
                          $ {stats.paidAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  {/* Receipt Status Pie Chart */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Receipt Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Paid', value: stats.paidAmount || 0 },
                            { name: 'Pending', value: stats.pendingAmount || 0 },
                            { name: 'Claim Pending', value: stats.claimsAmount || 0 },
                            { name: 'Funding Pending', value: stats.fundingAmount || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name}: $${(value || 0).toLocaleString()}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#a855f7" />
                        </Pie>
                        <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Transaction Type Bar Chart */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Transaction Types</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: 'Receipts', count: receipts.length },
                          { name: 'Insurance Claims', count: insuranceClaims.length },
                          { name: 'Government Funding', count: governmentFunding.length }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Insurance Claims Status Bar Chart */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Insurance Claims Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: 'Submitted', count: insuranceClaims.filter(c => c.status === 'submitted').length },
                          { name: 'Processing', count: insuranceClaims.filter(c => c.status === 'processing').length },
                          { name: 'Approved', count: insuranceClaims.filter(c => c.status === 'approved').length },
                          { name: 'Rejected', count: insuranceClaims.filter(c => c.status === 'rejected').length }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Government Funding Status Pie Chart */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Government Funding Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Submitted', value: governmentFunding.filter(f => f.status === 'submitted').length },
                            { name: 'Processing', value: governmentFunding.filter(f => f.status === 'processing').length },
                            { name: 'Approved', value: governmentFunding.filter(f => f.status === 'approved').length },
                            { name: 'Rejected', value: governmentFunding.filter(f => f.status === 'rejected').length }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Revenue Trend Bar Chart */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Revenue Summary by Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: 'Total Revenue', amount: stats.totalRevenue },
                          { name: 'Paid', amount: stats.paidAmount },
                          { name: 'Pending', amount: stats.pendingAmount },
                          { name: 'Claims', amount: stats.claimsAmount },
                          { name: 'Funding', amount: stats.fundingAmount }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="amount" name="Amount ($)" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(() => {
                      const allTransactions = createCombinedTransactions();
                      return [
                        { id: "all" as TabType, label: "All Receipts", count: allTransactions.filter(t => {
                          const matchesSearch = 
                            t.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.claimantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        }).length },
                        { id: "paid" as TabType, label: "Paid", count: allTransactions.filter(t => {
                          const matchesSearch = 
                            t.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.claimantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch && ((t.type === 'receipt' && t.status === "Paid") || ((t.type === 'insurance' || t.type === 'government') && t.status === "approved"));
                        }).length },
                        { id: "pending" as TabType, label: "Pending Payment", count: allTransactions.filter(t => {
                          const matchesSearch = 
                            t.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.claimantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch && ((t.type === 'receipt' && t.status === "Pending") || ((t.type === 'insurance' || t.type === 'government') && (t.status === "submitted" || t.status === "processing")));
                        }).length + unpaidAppointments.length },
                        { id: "claims" as TabType, label: "Insurance Claims", count: insuranceClaims.length },
                        { id: "funding" as TabType, label: "Government Funding", count: governmentFunding.length },
                      ];
                    })().map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          selectedTab === tab.id
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedTab === tab.id ? "bg-emerald-500" : "bg-gray-300"
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* ===== MAIN CONTENT AREA ===== */}
                  
{selectedTab === "claims" && (
  <div className="overflow-x-auto">
    {insuranceClaims.length === 0 ? (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No insurance claims found</p>
      </div>
    ) : (
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Bill ID</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Receipt No</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Claimant</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Insurance Provider</th>
            <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Policy Number</th>
            <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700">Amount</th>
            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Submitted Date</th>
            <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {insuranceClaims.map((claim) => (
            <tr key={claim._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4">
                <span className="font-mono text-sm font-medium text-blue-600">{claim.billId}</span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{claim.receiptNo}</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-800">{claim.claimantName}</span>
                  <span className="text-xs text-gray-500">ID: {claim.claimantId}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">{claim.insuranceProvider}</span>
                  <span className="text-xs text-gray-500">{claim.policyNumber}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="font-mono text-sm text-gray-600">{claim.policyNumber}</span>
               </td>
              <td className="py-4 px-4 text-right">
                <span className="font-bold text-gray-800">$ {claim.amount?.toLocaleString() || 0}</span>
               </td>
              <td className="py-4 px-4 text-center">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                  claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                  claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  claim.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                </span>
               </td>
              <td className="py-4 px-4 text-center">
                <span className="text-sm text-gray-700">{new Date(claim.createdAt).toLocaleDateString()}</span>
               </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  {(claim.status === 'submitted' || claim.status === 'processing') && (
                    <>
                      <button
                        onClick={() => updateClaimStatus(claim._id, 'approved', 'insurance')}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-all"
                        title="Approve claim"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateClaimStatus(claim._id, 'rejected', 'insurance')}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all"
                        title="Reject claim"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => alert(
                      `Insurance Claim Details:\n` +
                      `Bill ID: ${claim.billId}\n` +
                      `Receipt No: ${claim.receiptNo}\n` +
                      `Claimant: ${claim.claimantName}\n` +
                      `Claimant ID: ${claim.claimantId}\n` +
                      `Insurance Provider: ${claim.insuranceProvider}\n` +
                      `Policy Number: ${claim.policyNumber}\n` +
                      `Amount: $ ${claim.amount}\n` +
                      `Status: ${claim.status}\n` +
                      `Submitted: ${new Date(claim.createdAt).toLocaleDateString()}`
                    )}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
               </td>
             </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
                  {/* Case 2: Show Government Funding */}
                  {selectedTab === "funding" && (
                    <div className="overflow-x-auto">
                      {filteredFunding.length === 0 ? (
                        <div className="text-center py-12">
                          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">No government funding applications found</p>
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Bill ID</th>
                              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Receipt No</th>
                              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Beneficiary</th>
                              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Program Type</th>
                              <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700">Amount</th>
                              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                             </thead>
                          <tbody>
                            {filteredFunding.map((funding) => (
                            <tr key={funding._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-4">
                                  <span className="font-mono text-sm font-medium text-purple-600">{funding.billId}</span>
                                 </td>
                                <td className="py-4 px-4">
                                  <span className="text-sm text-gray-700">{funding.receiptNo}</span>
                                 </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">{funding.beneficiaryName}</span>
                                    <span className="text-xs text-gray-500">ID: {funding.beneficiaryId}</span>
                                  </div>
                                 </td>
                                <td className="py-4 px-4">
                                  <span className="text-sm text-gray-700">{funding.programType}</span>
                                 </td>
                                <td className="py-4 px-4 text-right">
                                  <span className="font-bold text-gray-800">$ {funding.amount?.toLocaleString() || 0}</span>
                                 </td>
                                <td className="py-4 px-4 text-center">
                                  {getFundingStatusBadge(funding.status)}
                                 </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {(funding.status === 'submitted' || funding.status === 'processing') && (
                                      <>
                                        <button
                                          onClick={() => updateClaimStatus(funding._id, 'approved', 'government')}
                                          className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-all"
                                          title="Approve funding"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => updateClaimStatus(funding._id, 'rejected', 'government')}
                                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all"
                                          title="Reject funding"
                                        >
                                          <AlertCircle className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => alert(
                                        `Funding Details:\n` +
                                        `Bill ID: ${funding.billId}\n` +
                                        `Receipt No: ${funding.receiptNo}\n` +
                                        `Beneficiary: ${funding.beneficiaryName}\n` +
                                        `Program: ${funding.programType}\n` +
                                        `Amount: $ ${funding.amount}\n` +
                                        `Status: ${funding.status}\n` +
                                        `Reference: ${funding.referenceNumber || 'N/A'}`
                                      )}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                      title="View details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                 </td>
                               </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Case 3: Show Receipts (all, paid, pending) */}
                  {(selectedTab === "all" || selectedTab === "paid" || selectedTab === "pending") && (
                    <>
                      {filteredCombinedTransactions.length === 0 && (selectedTab !== "pending" || unpaidAppointments.length === 0) ? (
                        <div className="text-center py-12">
                          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg">No transactions found</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Type</th>
                                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Receipt/ID No</th>
                                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Details</th>
                                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700">Amount</th>
                                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredCombinedTransactions.map((transaction) => {
                                const receipt = transaction.type === 'receipt' ? (transaction.rawData as Receipt) : null;
                                const insurance = transaction.type === 'insurance' ? (transaction.rawData as InsuranceClaim) : null;
                                const government = transaction.type === 'government' ? (transaction.rawData as GovernmentFunding) : null;

                                return (
                                  <tr key={`${transaction.type}-${transaction._id}`} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-4">
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        transaction.type === 'receipt' ? 'bg-emerald-100 text-emerald-800' :
                                        transaction.type === 'insurance' ? 'bg-blue-100 text-blue-800' :
                                        'bg-purple-100 text-purple-800'
                                      }`}>
                                        {transaction.type === 'receipt' ? 'Receipt' :
                                         transaction.type === 'insurance' ? 'Insurance' :
                                         'Government'}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="flex flex-col">
                                        <span className="font-mono text-sm font-medium text-gray-800">{transaction.receiptNo || transaction.billId}</span>
                                        <span className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">
                                          {transaction.patientName || transaction.claimantName || transaction.beneficiaryName}
                                        </span>
                                        {transaction.type === 'receipt' && receipt ? (
                                          <div className="flex flex-wrap gap-1 max-w-xs mt-1">
                                            {receipt.services?.slice(0, 2).map((s, i) => (
                                              <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
                                                {s.name}
                                              </span>
                                            ))}
                                            {receipt.services?.length > 2 && (
                                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
                                                +{receipt.services.length - 2} more
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-xs text-gray-500">
                                            {insurance ? `Policy: ${insurance.policyNumber}` :
                                             government ? `Program: ${government.programType}` : 'N/A'}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                      <span className="font-bold text-gray-800">$ {transaction.amount?.toLocaleString() || 0}</span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      {transaction.type === 'receipt' ? (
                                        getStatusBadge((transaction.rawData as Receipt).status || 'Pending')
                                      ) : (
                                        getFundingStatusBadge(transaction.status)
                                      )}
                                    </td>
                                    <td className="py-4 px-4">
                                      <div className="flex items-center justify-center gap-2">
                                        {transaction.type === 'receipt' && receipt ? (
                                          <>
                                            <button
                                              onClick={() => setShowPaymentDetails(receipt)}
                                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                              title="View payment details"
                                            >
                                              <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => openEditModal(receipt)}
                                              disabled={receipt.status === "Paid"}
                                              className={`p-2 rounded-lg transition-all ${
                                                receipt.status === "Paid"
                                                  ? "text-gray-400 cursor-not-allowed bg-gray-100"
                                                  : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                              }`}
                                              title={receipt.status === "Paid" ? "Cannot edit paid receipts" : "Edit receipt"}
                                            >
                                              {receipt.status === "Paid" ? <Lock className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                            </button>
                                            {receipt.status !== "Paid" && (
                                              <button
                                                onClick={() => openPaymentModal(receipt)}
                                                className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-all"
                                                title="Mark as paid"
                                              >
                                                <PaymentIcon className="w-4 h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteReceipt(receipt._id)}
                                              disabled={receipt.status === "Paid"}
                                              className={`p-2 rounded-lg transition-all ${
                                                receipt.status === "Paid"
                                                  ? "text-gray-400 cursor-not-allowed bg-gray-100"
                                                  : "text-red-600 hover:text-red-800 hover:bg-red-50"
                                              }`}
                                              title={receipt.status === "Paid" ? "Cannot delete paid receipts" : "Delete receipt"}
                                            >
                                              {receipt.status === "Paid" ? <Lock className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                          </>
                                        ) : transaction.type === 'insurance' ? (
                                          <>
                                            <button
                                              onClick={() => alert(
                                                `Insurance Claim Details:\n` +
                                                `Bill ID: ${insurance?.billId}\n` +
                                                `Receipt No: ${insurance?.receiptNo}\n` +
                                                `Claimant: ${insurance?.claimantName}\n` +
                                                `Insurance: ${insurance?.insuranceProvider}\n` +
                                                `Amount: $ ${insurance?.amount}\n` +
                                                `Status: ${insurance?.status}`
                                              )}
                                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                              title="View details"
                                            >
                                              <Eye className="w-4 h-4" />
                                            </button>
                                            {(insurance?.status === 'submitted' || insurance?.status === 'processing') && (
                                              <>
                                                <button
                                                  onClick={() => updateClaimStatus(insurance._id, 'approved', 'insurance')}
                                                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-all"
                                                  title="Approve"
                                                >
                                                  <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => updateClaimStatus(insurance._id, 'rejected', 'insurance')}
                                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                  title="Reject"
                                                >
                                                  <AlertCircle className="w-4 h-4" />
                                                </button>
                                              </>
                                            )}
                                          </>
                                        ) : government ? (
                                          <>
                                            <button
                                              onClick={() => alert(
                                                `Funding Details:\n` +
                                                `Bill ID: ${government.billId}\n` +
                                                `Beneficiary: ${government.beneficiaryName}\n` +
                                                `Program: ${government.programType}\n` +
                                                `Amount: Rs ${government.amount}\n` +
                                                `Status: ${government.status}`
                                              )}
                                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                              title="View details"
                                            >
                                              <Eye className="w-4 h-4" />
                                            </button>
                                            {(government.status === 'submitted' || government.status === 'processing') && (
                                              <>
                                                <button
                                                  onClick={() => updateClaimStatus(government._id, 'approved', 'government')}
                                                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-all"
                                                  title="Approve"
                                                >
                                                  <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => updateClaimStatus(government._id, 'rejected', 'government')}
                                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                  title="Reject"
                                                >
                                                  <AlertCircle className="w-4 h-4" />
                                                </button>
                                              </>
                                            )}
                                          </>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              {/* Show unpaid appointments in pending tab */}
                              {selectedTab === "pending" && unpaidAppointments.map((appt) => (
                                <tr key={`appointment-${appt._id}`} className="border-b border-gray-100 hover:bg-yellow-50 transition-colors bg-yellow-50">
                                  <td className="py-4 px-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Appointment
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex flex-col">
                                      <span className="font-mono text-sm font-medium text-yellow-600">APT-{appt._id.slice(-6)}</span>
                                      <span className="text-xs text-gray-500">{new Date(appt.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-800">{appt.patientName}</span>
                                      <span className="text-xs text-gray-500">Dr. {appt.doctorName}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <span className="font-bold text-gray-800">Rs {appt.consultationFee?.toLocaleString() || 0}</span>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <Clock className="w-3 h-3" />
                                      Pending
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedAppointmentForPayment(appt);
                                        setShowAppointmentPaymentModal(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-all"
                                      title="View details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </main>
          </div>

          {isMobile && sidebarOpen && !showModal && !showPaymentModal && !showPaymentDetails && !showAppointmentPaymentModal && (
            <div
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingReceipt ? "Edit Receipt" : "Create New Receipt"}
              </h2>
              <div className="flex items-center gap-3">
                {editingReceipt && editingReceipt.status !== "Paid" && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      openPaymentModal(editingReceipt);
                    }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                    title="Mark as paid"
                  >
                    <PaymentIcon className="w-4 h-4" />
                    Mark Payment
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingReceipt(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ReceiptForm
                onSubmit={editingReceipt ? handleEditReceipt : handleAddReceipt}
                onCancel={() => {
                  setShowModal(false);
                  setEditingReceipt(null);
                }}
                initialData={editingReceipt || undefined}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Marking Modal */}
      {showPaymentModal && selectedReceiptForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800">Mark Payment</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReceiptForPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PaymentIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Confirm Payment</h3>
                  <p className="text-gray-600 mt-2">
                    Are you sure you want to mark this receipt as paid?
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Receipt No:</span>
                      <p className="text-gray-900">{selectedReceiptForPayment.receiptNo}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Patient:</span>
                      <p className="text-gray-900">{selectedReceiptForPayment.patientName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Amount:</span>
                      <p className="text-gray-900 font-bold">Rs {selectedReceiptForPayment.total?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Current Status:</span>
                      {getStatusBadge(selectedReceiptForPayment.status || 'Pending')}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => updatePaymentStatus(selectedReceiptForPayment._id, 'Paid')}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedReceiptForPayment(null);
                    }}
                    className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-gray-600 mb-3">Or mark as:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updatePaymentStatus(selectedReceiptForPayment._id, 'Claim Pending')}
                      className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <Shield className="w-4 h-4" />
                      Insurance Claim
                    </button>
                    <button
                      onClick={() => updatePaymentStatus(selectedReceiptForPayment._id, 'Funding Pending')}
                      className="bg-purple-100 text-purple-700 py-2 px-3 rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <Building2 className="w-4 h-4" />
                      Gov Funding
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-800">Payment Details</h2>
              <button
                onClick={() => setShowPaymentDetails(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Receipt No:</label>
                    <p className="text-gray-900">{showPaymentDetails.receiptNo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Patient:</label>
                    <p className="text-gray-900">{showPaymentDetails.patientName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Amount:</label>
                    <p className="text-gray-900 font-bold">Rs {showPaymentDetails.total?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Status:</label>
                    {getStatusBadge(showPaymentDetails.status || 'Pending')}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Patient ID:</label>
                    <p className="text-gray-900">{showPaymentDetails.patientId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Created:</label>
                    <p className="text-gray-900">{new Date(showPaymentDetails.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {showPaymentDetails.services?.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Services:</label>
                    <div className="mt-2 space-y-1">
                      {showPaymentDetails.services.map((s, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                          <span>{s.name}</span>
                          <span className="font-medium">Rs {s.cost?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => updatePaymentStatus(showPaymentDetails._id, 'Paid')}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => updatePaymentStatus(showPaymentDetails._id, 'Pending')}
                    className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Mark as Pending
                  </button>
                  <button
                    onClick={() => setShowPaymentDetails(null)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Payment Modal */}
      {showAppointmentPaymentModal && selectedAppointmentForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-800">Appointment Payment</h2>
              <button
                onClick={() => {
                  setShowAppointmentPaymentModal(false);
                  setSelectedAppointmentForPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">Appointment Payment</h3>
                  <p className="text-gray-600 mt-2">
                    Select a payment method for this appointment
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Patient:</span>
                      <p className="text-gray-900">{selectedAppointmentForPayment.patientName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Doctor:</span>
                      <p className="text-gray-900">Dr. {selectedAppointmentForPayment.doctorName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Amount:</span>
                      <p className="text-gray-900 font-bold">Rs {selectedAppointmentForPayment.consultationFee?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Date:</span>
                      <p className="text-gray-900">{new Date(selectedAppointmentForPayment.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handleAppointmentPayment(selectedAppointmentForPayment, 'Paid');
                    }}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Paid (Card)
                  </button>
                  
                  <button
                    onClick={() => {
                      handleAppointmentPayment(selectedAppointmentForPayment, 'Claim Pending');
                    }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Shield className="w-5 h-5" />
                    Insurance Claim
                  </button>

                  <button
                    onClick={() => {
                      handleAppointmentPayment(selectedAppointmentForPayment, 'Funding Pending');
                    }}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-5 h-5" />
                    Government Funding
                  </button>

                  <button
                    onClick={() => {
                      setShowAppointmentPaymentModal(false);
                      setSelectedAppointmentForPayment(null);
                    }}
                    className="w-full bg-gray-500 text-white py-3 px-4 rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminRoute>
  );
};

export default AdminPayment;