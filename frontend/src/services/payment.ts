import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { paymentApi } from './payment.api';
import type { BillDetails, ConfirmPaymentResponse, InsuranceData, GovernmentData } from '../api/payment';

export const paymentService = {
  processStripePayment: async (
    stripe: Stripe,
    elements: StripeElements,
    cardholderName: string,
    billDetails: BillDetails
  ): Promise<ConfirmPaymentResponse> => {
    if (!stripe || !elements) {
      throw new Error('Stripe has not loaded. Please refresh the page.');
    }

    if (!cardholderName.trim()) {
      throw new Error('Cardholder name is required');
    }

    const { clientSecret } = await paymentApi.createPaymentIntent({
      amount: billDetails.amount,
      billId: billDetails.billId,
      receiptNo: billDetails.receiptNo,
      paymentType: billDetails.type || 'receipt',
      appointmentId: billDetails.appointmentId,
      patientId: billDetails.patientId,
    });

    if (!clientSecret) {
      throw new Error('No client secret received from server');
    }

    const cardElement = elements.getElement('card');
    if (!cardElement) {
      throw new Error('Card element not found');
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { name: cardholderName },
      },
    } as any);

    if (error) {
      throw new Error(error.message || 'Payment processing failed');
    }

    if (!paymentIntent) {
      throw new Error('Payment intent confirmation failed');
    }

    if (paymentIntent.status === 'succeeded') {
      const result = await paymentApi.confirmPayment({
        paymentIntentId: paymentIntent.id,
        billId: billDetails.billId,
        paymentType: billDetails.type || 'receipt',
        appointmentId: billDetails.appointmentId,
      });

      if (!result.success) {
        throw new Error(result.message || 'Payment confirmation failed');
      }
      return result;
    } else if (paymentIntent.status === 'requires_action') {
      throw new Error('Payment requires additional authentication. Please complete the 3D Secure verification.');
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }
  },

  submitInsuranceClaim: async (insuranceData: InsuranceData, billDetails: BillDetails) => {
    const claimData = {
      billId: billDetails.billId,
      receiptNo: billDetails.receiptNo,
      amount: billDetails.amount,
      paymentType: billDetails.type,
      appointmentId: billDetails.appointmentId,
      ...insuranceData,
    };
    return paymentApi.submitInsuranceClaim(claimData);
  },

  submitGovernmentFunding: async (governmentData: GovernmentData, billDetails: BillDetails) => {
    const fundingData = {
      billId: billDetails.billId,
      receiptNo: billDetails.receiptNo,
      amount: billDetails.amount,
      paymentType: billDetails.type,
      appointmentId: billDetails.appointmentId,
      ...governmentData,
    };
    return paymentApi.submitGovernmentFunding(fundingData);
  },

  loadBillDetails: async (billId: string): Promise<BillDetails | null> => {
    try {
      const receiptData = await paymentApi.fetchBillDetails(billId);
      return {
        billId: receiptData._id,
        amount: receiptData.total,
        receiptNo: receiptData.receiptNo,
        patientId: receiptData.patientId,
        patientName: receiptData.patientName,
        services: receiptData.services || [],
        createdAt: receiptData.createdAt,
        status: receiptData.status,
        type: 'receipt',
      };
    } catch (error) {
      return null;
    }
  },

  createAppointmentBill: (appointmentData: any): BillDetails => {
    return {
      billId: appointmentData.appointmentId,
      amount: appointmentData.amount,
      receiptNo: `APT-${appointmentData.appointmentId.slice(-6)}`,
      patientId: appointmentData.appointmentDetails?.patientId || '',
      patientName: appointmentData.appointmentDetails?.patientName || 'Patient',
      services: [
        {
          name: 'Doctor Consultation',
          cost: appointmentData.amount,
          description: `Consultation with ${appointmentData.appointmentDetails?.doctorName || 'Doctor'}`,
        },
      ],
      createdAt: new Date().toISOString(),
      status: 'Pending',
      type: 'appointment',
      appointmentId: appointmentData.appointmentId,
      doctorName: appointmentData.appointmentDetails?.doctorName,
      appointmentDate: appointmentData.appointmentDetails?.date,
      appointmentTime: appointmentData.appointmentDetails?.time,
    };
  },
};