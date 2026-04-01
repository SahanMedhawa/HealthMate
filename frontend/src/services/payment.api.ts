const API_BASE = 'http://localhost:5008/api';

export const paymentApi = {
  createPaymentIntent: async (data: {
    amount: number;
    billId: string;
    receiptNo: string;
    paymentType: string;
    appointmentId?: string;
    patientId: string;
  }) => {
    const response = await fetch(`${API_BASE}/payments/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment intent');
    }
    return response.json();
  },

  confirmPayment: async (data: {
    paymentIntentId: string;
    billId: string;
    paymentType: string;
    appointmentId?: string;
  }) => {
    const response = await fetch(`${API_BASE}/payments/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to confirm payment');
    }
    return response.json();
  },

  submitInsuranceClaim: async (data: any) => {
    const response = await fetch(`${API_BASE}/insurance/insurance-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit insurance claim');
    }
    return response.json();
  },

  submitGovernmentFunding: async (data: any) => {
    const response = await fetch(`${API_BASE}/government/government-funding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit funding request');
    }
    return response.json();
  },

  fetchBillDetails: async (billId: string) => {
    const response = await fetch(`${API_BASE}/receipts/${billId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bill details');
    }
    return response.json();
  },
};