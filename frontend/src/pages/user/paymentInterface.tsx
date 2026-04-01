import React, { useState, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { CreditCard, Shield, Building2, User, FileText, Calendar, Clock, Eye, EyeOff, ArrowLeft, DollarSign } from "lucide-react";
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { CardElementProps } from '@stripe/react-stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import type{ BillDetails, FeeBreakdown, InsuranceData, GovernmentData } from '../../api/payment';
import { paymentService } from '../../services/payment';
import Navbar from "../../components/user/Navbar";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

// Stripe Card Form Component
interface StripeCardFormProps {
  billDetails: BillDetails;
  onSuccess: () => void;
  onError: (errorMessage: string) => void;
}

const StripeCardForm: React.FC<StripeCardFormProps> = ({ billDetails, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState<boolean>(false);
  const [cardholderName, setCardholderName] = useState<string>('');
  const [cardElementError, setCardElementError] = useState<string | null>(null);

  const cardElementOptions: CardElementProps['options'] = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' },
      },
      invalid: { color: '#9e2146' },
    },
  };

  const handleCardChange = (event: any) => {
    setCardElementError(event.error?.message || null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcessing(true);

    try {
      await paymentService.processStripePayment(stripe!, elements!, cardholderName, billDetails);
      setProcessing(false);
      onSuccess();
    } catch (err) {
      setProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      onError(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <input 
          type="text" 
          placeholder="Cardholder Name" 
          value={cardholderName} 
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCardholderName(e.target.value)} 
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300 shadow-sm" 
          required
        />
        <User className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Card Details</label>
        <div className={`px-4 py-3 rounded-lg border-2 ${cardElementError ? 'border-red-500' : 'border-gray-300'} bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all duration-300`}>
          <CardElement options={cardElementOptions} onChange={handleCardChange} />
        </div>
        {cardElementError && <p className="text-red-500 text-sm mt-2">{cardElementError}</p>}
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !cardholderName || !!cardElementError}
        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
          !stripe || processing || !cardholderName || cardElementError
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
        }`}
      >
        {processing ? (
          <span className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Processing Payment...
          </span>
        ) : (
          `Pay $ ${billDetails.amount.toFixed(2)}`
        )}
      </button>
    </form>
  );
};

// Main Payment Page
const PaymentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showBillId, setShowBillId] = useState<boolean>(false);
  const [billDetails, setBillDetails] = useState<BillDetails>({
    billId: "",
    amount: 0,
    receiptNo: "",
    patientId: "",
    patientName: "",
    services: [],
    createdAt: "",
    status: "Pending",
    type: 'receipt'
  });
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);

  const [insuranceData, setInsuranceData] = useState<InsuranceData>({
    insuranceProvider: '',
    policyNumber: '',
    claimantName: '',
    claimantId: ''
  });

  const [governmentData, setGovernmentData] = useState<GovernmentData>({
    programType: '',
    beneficiaryId: '',
    beneficiaryName: '',
    referenceNumber: ''
  });

  useEffect(() => {
    // Handle appointment payment from location state
    if (location.state?.appointmentId && location.state?.amount) {
      const bill = paymentService.createAppointmentBill(location.state);
      setBillDetails(bill);
      if (location.state?.feeBreakdown) {
        setFeeBreakdown(location.state.feeBreakdown);
      }
      return;
    }

    // Handle bill payment from URL params
    const params = new URLSearchParams(window.location.search);
    const billId = params.get('billId');
    
    if (billId) {
      paymentService.loadBillDetails(billId).then(bill => {
        if (bill) {
          setBillDetails(bill);
        } else {
          setBillDetails({
            billId: billId,
            amount: parseFloat(params.get('amount') || '0'),
            receiptNo: params.get('receiptNo') || "",
            patientId: params.get('patientId') || "",
            patientName: params.get('patientName') || "Patient Name",
            services: [],
            createdAt: new Date().toISOString(),
            status: "Pending",
            type: 'receipt'
          });
        }
      });
    }
  }, [location.state]);

  const handlePaymentSuccess = (): void => {
    alert('Payment successful!');
    navigate(billDetails.type === 'appointment' ? '/my-appointments' : '/payment');
  };

  const handlePaymentError = (errorMessage: string): void => {
    setError(errorMessage);
  };

  const handleInsuranceClaim = async (): Promise<void> => {
    if (!insuranceData.insuranceProvider || !insuranceData.policyNumber || !insuranceData.claimantName || !insuranceData.claimantId) {
      setError('Please fill all required fields');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await paymentService.submitInsuranceClaim(insuranceData, billDetails);
      alert('Insurance claim submitted successfully! You will be notified once approved.');
      navigate(billDetails.type === 'appointment' ? '/my-appointments' : '/payment');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit claim. Please try again.';
      setError(errorMessage);
    }
    
    setProcessing(false);
  };

  const handleGovernmentFunding = async (): Promise<void> => {
    if (!governmentData.programType || !governmentData.beneficiaryId || !governmentData.beneficiaryName) {
      setError('Please fill all required fields');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await paymentService.submitGovernmentFunding(governmentData, billDetails);
      alert('Government funding request submitted successfully!');
      navigate(billDetails.type === 'appointment' ? '/my-appointments' : '/payment');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit funding request. Please try again.';
      setError(errorMessage);
    }
    
    setProcessing(false);
  };

  const paymentMethods = [
    {
      id: "card",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Secure payment via Stripe",
      color: "from-teal-500 to-teal-600",
    },
    {
      id: "insurance",
      name: "Insurance Claim",
      icon: Shield,
      description: "Submit insurance claim",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "government",
      name: "Government Funding",
      icon: Building2,
      description: "Apply for government assistance",
      color: "from-purple-500 to-purple-600",
    }
  ];

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
     <Navbar />
    <div 
      className="text-white relative flex flex-col items-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 "
      style={{ background: "linear-gradient(135deg, #6e88b7 0%, #4a81df 100%)" }}
    >
      
      <div className="max-w-6xl w-full">
        {/* Header */}
       
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-center my-8 text-black">
            {billDetails.type === 'appointment' ? 'Pay for Appointment' : 'Complete Payment'}
          </h2>
          <p className="text-center text-gray-700 text-lg">
            {billDetails.type === 'appointment' 
              ? 'Review your appointment details and choose payment method'
              : 'Review your bill details and choose payment method'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Bill/Appointment Details */}
          <div className="space-y-6">
            <div className="bg-white shadow-2xl rounded-2xl p-8 border border-teal-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="mr-3 text-teal-500" size={28} />
                {billDetails.type === 'appointment' ? 'Appointment Summary' : 'Bill Summary'}
              </h3>
              
              <div className="space-y-6">
                {/* Patient Information */}
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <User className="mr-2 text-teal-500" size={20} />
                    Patient Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-teal-600 font-medium">Patient Name:</span>
                      <p className="font-semibold text-gray-800">{billDetails.patientName}</p>
                    </div>
                    <div>
                      <span className="text-teal-600 font-medium">Reference No:</span>
                      <p className="font-semibold text-gray-800">{billDetails.receiptNo}</p>
                    </div>
                  </div>
                </div>

                {/* Appointment-specific details */}
                {billDetails.type === 'appointment' && billDetails.doctorName && (
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <Calendar className="mr-2 text-teal-500" size={20} />
                      Appointment Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-teal-600 font-medium">Doctor:</span>
                        <p className="font-semibold text-gray-800">{billDetails.doctorName}</p>
                      </div>
                      <div>
                        <span className="text-teal-600 font-medium">Date:</span>
                        <p className="font-semibold text-gray-800">
                          {billDetails.appointmentDate ? formatDate(billDetails.appointmentDate) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-teal-600 font-medium">Time:</span>
                        <p className="font-semibold text-gray-800">{billDetails.appointmentTime || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fee Breakdown for Appointments */}
                {feeBreakdown && (
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                      <DollarSign className="mr-2 text-teal-500" size={20} />
                      Fee Breakdown
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Doctor's Fee:</span>
                        <span className="font-semibold text-gray-800">$ {feeBreakdown.doctorFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Hospital Charge (10%):</span>
                        <span className="font-semibold text-gray-800">$ {feeBreakdown.hospitalCharge.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT (8%):</span>
                        <span className="font-semibold text-gray-800">$ {feeBreakdown.vat.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-teal-200 pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-teal-600">$ {feeBreakdown.totalFee.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bill ID Section */}
                {billDetails.type === 'receipt' && (
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-800 flex items-center">
                        <FileText className="mr-2 text-teal-500" size={20} />
                        Bill Reference
                      </h4>
                      <button
                        onClick={() => setShowBillId(!showBillId)}
                        className="text-teal-600 hover:text-teal-800 text-sm flex items-center transition-colors duration-300"
                      >
                        {showBillId ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
                        {showBillId ? 'Hide' : 'Show'} Bill ID
                      </button>
                    </div>
                    {showBillId ? (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-mono break-all text-gray-700">{billDetails.billId}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-teal-600">Bill ID is hidden for security</p>
                    )}
                  </div>
                )}

                {/* Services Breakdown */}
                {billDetails.type === 'receipt' && billDetails.services && billDetails.services.length > 0 && (
                  <div className="border border-teal-100 rounded-xl overflow-hidden">
                    <h4 className="font-semibold text-gray-800 p-4 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-blue-50">
                      Services Breakdown
                    </h4>
                    <div className="p-4">
                      <div className="space-y-4">
                        {billDetails.services.map((service, index) => (
                          <div key={index} className="flex justify-between items-center py-3 border-b border-teal-50 last:border-b-0">
                            <div>
                              <p className="font-semibold text-gray-800">{service.name || `Service ${index + 1}`}</p>
                              {service.description && (
                                <p className="text-sm text-teal-600 mt-1">{service.description}</p>
                              )}
                            </div>
                            <p className="font-bold text-gray-800">
                            ${((service.cost || service.amount || 0) as number).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Amount */}
                <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-teal-100 text-sm">Total Amount Due</p>
                      <p className="text-3xl font-bold">$ {billDetails.amount.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-teal-100 text-sm">Reference</p>
                      <p className="font-semibold text-lg">{billDetails.receiptNo}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Options */}
          <div className="space-y-6">
            {/* Payment Method Selection */}
            <div className="bg-white shadow-2xl rounded-2xl p-8 border border-teal-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Select Payment Method</h3>
              
              <div className="grid grid-cols-1 gap-4">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setError(null);
                      }}
                      className={`cursor-pointer rounded-xl p-6 transition-all duration-300 border-2 ${
                        selectedMethod === method.id
                          ? "border-teal-500 bg-gradient-to-r from-teal-50 to-blue-50 shadow-lg scale-105"
                          : "border-gray-200 bg-white hover:border-teal-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mr-4 shadow-md`}>
                          <Icon className="text-white" size={28} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg mb-1">{method.name}</h4>
                          <p className="text-teal-600">{method.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-sm shadow-md">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">!</span>
                  </div>
                  {error}
                </div>
              </div>
            )}

            {/* Card Payment */}
            {selectedMethod === "card" && (
              <div className="bg-white shadow-2xl rounded-2xl p-8 border border-teal-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <CreditCard className="mr-3 text-teal-500" size={28} />
                  Card Payment
                </h3>
                <Elements stripe={stripePromise}>
                  <StripeCardForm
                    billDetails={billDetails}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              </div>
            )}

            {/* Insurance Claim Form */}
            {selectedMethod === "insurance" && (
              <div className="bg-white shadow-2xl rounded-2xl p-8 border border-teal-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Shield className="mr-3 text-blue-500" size={28} />
                  Insurance Claim
                </h3>
                <div className="space-y-6">
                  <div className="relative">
                    <select 
                      value={insuranceData.insuranceProvider}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setInsuranceData({...insuranceData, insuranceProvider: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm"
                      required
                    >
                      <option value="">Select provider</option>
                      <option value="Sri Lanka Insurance">Sri Lanka Insurance</option>
                      <option value="Ceylinco Insurance">Ceylinco Insurance</option>
                      <option value="AIA Insurance">AIA Insurance</option>
                      <option value="Union Assurance">Union Assurance</option>
                      <option value="Other">Other</option>
                    </select>
                    <Building2 className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Policy Number"
                      value={insuranceData.policyNumber}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setInsuranceData({...insuranceData, policyNumber: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm"
                      required
                    />
                    <FileText className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Claimant Name"
                      value={insuranceData.claimantName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setInsuranceData({...insuranceData, claimantName: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm"
                      required
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="National ID / Passport"
                      value={insuranceData.claimantId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setInsuranceData({...insuranceData, claimantId: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-sm"
                      required
                    />
                    <FileText className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <button
                    onClick={handleInsuranceClaim}
                    disabled={processing}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                      processing
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    }`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Insurance Claim'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Government Funding Form */}
            {selectedMethod === "government" && (
              <div className="bg-white shadow-2xl rounded-2xl p-8 border border-teal-200">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Building2 className="mr-3 text-purple-500" size={28} />
                  Government Funding
                </h3>
                <div className="space-y-6">
                  <div className="relative">
                    <select 
                      value={governmentData.programType}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setGovernmentData({...governmentData, programType: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 shadow-sm"
                      required
                    >
                      <option value="">Select program</option>
                      <option value="Samurdhi">Samurdhi</option>
                      <option value="Elderly Support">Elderly Support</option>
                      <option value="Disability Assistance">Disability Assistance</option>
                      <option value="Low Income Healthcare">Low Income Healthcare</option>
                      <option value="Other">Other</option>
                    </select>
                    <FileText className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Beneficiary ID"
                      value={governmentData.beneficiaryId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setGovernmentData({...governmentData, beneficiaryId: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 shadow-sm"
                      required
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Beneficiary Name"
                      value={governmentData.beneficiaryName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setGovernmentData({...governmentData, beneficiaryName: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 shadow-sm"
                      required
                    />
                    <User className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Reference Number (if applicable)"
                      value={governmentData.referenceNumber}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setGovernmentData({...governmentData, referenceNumber: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 shadow-sm"
                    />
                    <FileText className="h-5 w-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>

                  <button
                    onClick={handleGovernmentFunding}
                    disabled={processing}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                      processing
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                    }`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Funding Request'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default PaymentPage;