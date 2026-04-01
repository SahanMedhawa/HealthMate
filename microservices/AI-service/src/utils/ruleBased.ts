// src/utils/ruleBased.ts
export const ruleBasedCheck = (symptom: string) => {
  const mapping: { [key: string]: string } = {
    fever: "General Physician",
    rash: "Dermatologist",
    chest: "Cardiologist",
    pain: "Orthopedic",
    headache: "Neurologist",
    cough: "Pulmonologist",
    stomach: "Gastroenterologist",
    eye: "Ophthalmologist",
    ear: "ENT",
  };

  // Default to General Physician
  let suggested = "General Physician";

  Object.keys(mapping).forEach((key) => {
    if (symptom.toLowerCase().includes(key)) {
      suggested = mapping[key];
    }
  });

  return {
    suggestedSpecialty: suggested,
    urgency: "Medium",
    reason: `${symptom} may require ${suggested}`,
  };
};