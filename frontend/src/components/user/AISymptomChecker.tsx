import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar'; // ✅ Import the Navbar

export default function AISymptomChecker() {
  const [symptom, setSymptom] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

    const handleCheck = async () => {
    if (!symptom.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post('http://localhost:5007/api/ai/check', { symptom });
      
      console.log("Full API Response:", res.data); // Debug log to verify structure

      if (res.data.success && res.data.data) {
        const apiData = res.data.data;
        
        // ✅ FIX: Explicitly grab 'source' from the ROOT level and merge it in
        const finalResult = {
          suggestedSpecialty: apiData.suggestedSpecialty || "General Physician",
          urgency: apiData.urgency || "Low",
          reason: apiData.reason || "No detailed analysis available.",
          source: res.data.source || apiData.source || "unknown" // Check root first, then fallback
        };

        setResult(finalResult);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to connect to AI service.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Add the Navbar here */}
      <Navbar />

      {/* Main Content - Added pt-24 for spacing below navbar */}
      <div className="max-w-4xl mx-auto p-8 pt-12 pb-24">
        
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Symptom Checker</h1>
          <p className="text-gray-600">Get instant health insights powered by Google Gemini AI</p>
        </div>
        
        {/* Main Card */}
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          
          <textarea 
            className="w-full border border-gray-300 p-4 rounded-lg mb-4 h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-700 placeholder-gray-400 transition-shadow" 
            placeholder="Describe your symptoms in detail (e.g., 'I have a severe headache behind my eyes and sensitivity to light')..." 
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
          />
          
          <button 
            onClick={handleCheck} 
            disabled={loading || !symptom.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing with AI...
              </span>
            ) : (
              "Analyze Symptoms"
            )}
          </button>

          {/* Result Display */}
          {result && (
            <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl animate-fade-in shadow-inner">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-bold text-2xl text-green-900">{result.suggestedSpecialty}</h2>
                {result.source === 'gemini' && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
                    AI Verified
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Urgency Level:</span>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                  result.urgency?.toLowerCase().includes('high') || result.urgency?.toLowerCase().includes('emergency')
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : result.urgency?.toLowerCase().includes('medium')
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {result.urgency}
                </span>
              </div>

              <div className="bg-white/60 p-4 rounded-lg border border-green-100 mb-4">
                <p className="text-gray-800 leading-relaxed font-medium">{result.reason}</p>
              </div>
              
              <div className="pt-4 border-t border-green-200/60 flex justify-between items-center text-xs">
                <p className="text-gray-600 font-medium">
                  Analysis Source:{' '}
                  <span className="font-bold text-gray-800">
                    {result.source === 'gemini' ? 'Google Gemini AI' : (result.source === 'fallback' ? 'System Fallback' : (result.source || 'Unknown'))}
                  </span>
                </p>
                {result.source === 'gemini' && (
                   <span className="text-green-600 font-semibold flex items-center gap-1">
                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                     Live API
                   </span>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-8 text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="flex items-center justify-center gap-2">
              <span className="text-orange-500">⚠️</span> 
              <strong>Disclaimer:</strong> This is an AI assistant and not a medical diagnosis. Always consult a qualified healthcare professional for medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}