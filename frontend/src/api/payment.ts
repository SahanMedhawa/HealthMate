export interface Service {
  name?: string;
  cost?: number;
  amount?: number;
  description?: string;
}

export interface BillDetails {
  billId: string;
  amount: number;
  receiptNo: string;
  patientId: string;
  patientName: string;
  services: Service[];
  createdAt: string;
  status: string;
  type?: 'receipt' | 'appointment';
  appointmentId?: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface FeeBreakdown {
  doctorFee: number;
  hospitalCharge: number;
  vat: number;
  totalFee: number;
}

export interface InsuranceData {
  insuranceProvider: string;
  policyNumber: string;
  claimantName: string;
  claimantId: string;
}

export interface GovernmentData {
  programType: string;
  beneficiaryId: string;
  beneficiaryName: string;
  referenceNumber: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  message?: string;
}