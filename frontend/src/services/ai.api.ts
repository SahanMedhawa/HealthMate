import api from './api';

export interface AISymptomResponse {
  success: boolean;
  source: 'gemini' | 'rule-based';
  disclaimer: string;
  data: {
    suggestedSpecialty: string;
    urgency: 'High' | 'Medium' | 'Low';
    reason: string;
  };
}

export const checkSymptom = async (symptom: string): Promise<AISymptomResponse> => {
  const response = await api.post('/ai/check', { symptom });
  return response.data;
};