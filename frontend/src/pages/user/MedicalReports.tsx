import React, { useState, useEffect } from 'react';
import patientAPI from '../../services/patient.api';
import type { MedicalReport } from '../../services/patient.api';
import Navbar from '../../components/user/Navbar';

// Extend the MedicalReport type locally
interface ExtendedMedicalReport extends MedicalReport {
  source?: 'doctor' | 'hospital' | 'patient_upload';
  category?: 'external_record' | 'lab_result' | 'imaging' | 'prescription_other' | 'insurance' | 'other';
  doctorId?: string;
  doctorName?: string;
}

const MedicalReports: React.FC = () => {
  const [reports, setReports] = useState<ExtendedMedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    category: 'external_record',
    description: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await patientAPI.getMedicalReports();
      const reportsData = response.reports || [];
      
      // Only show patient-uploaded reports
      const patientUploads = reportsData.filter((report: any) => 
        report.source === 'patient_upload' || 
        (!report.source && !report.doctorId && !report.doctorName)
      );
      
      const enrichedReports: ExtendedMedicalReport[] = patientUploads.map((report: any) => ({
        ...report,
        source: report.source || 'patient_upload',
        category: report.category || 'external_record'
      }));
      
      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadData.file || !uploadData.title) {
      alert('Please fill in all required fields');
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (uploadData.file.size > MAX_FILE_SIZE) {
      alert(`File is too large! Maximum file size is 5MB. Your file is ${(uploadData.file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(uploadData.file.type)) {
      alert('Invalid file type. Please upload PDF, JPG, or PNG files only.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('title', uploadData.title);
    formData.append('category', uploadData.category);
    formData.append('description', uploadData.description);
    formData.append('source', 'patient_upload');
    formData.append('reportType', uploadData.category);

    try {
      await patientAPI.uploadMedicalReport(formData);
      await fetchReports();
      setShowUploadModal(false);
      setUploadData({ title: '', category: 'external_record', description: '', file: null });
      alert('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading:', error);
      if (error.response?.status === 413) {
        alert('File is too large. Maximum file size is 5MB.');
      } else if (error.response?.status === 400) {
        alert(error.response?.data?.message || 'Invalid file type');
      } else {
        alert('Failed to upload document');
      }
    } finally {
      setUploading(false);
    }
  };

  const personalUploads = reports;

  const handleDownload = (report: ExtendedMedicalReport) => {
    if (report.fileUrl) {
      const baseUrl = 'http://localhost:5001';
      window.open(`${baseUrl}${report.fileUrl}`, '_blank');
    } else {
      alert('No file available for download');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await patientAPI.deleteMedicalReport(reportId);
        await fetchReports();
        alert('Document deleted successfully');
      } catch (error) {
        console.error('Error deleting:', error);
        alert('Failed to delete document');
      }
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading medical records...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 mt-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Medical Records</h1>
                  <p className="text-blue-100">Upload and manage your personal medical documents</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-white text-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all duration-200 flex items-center font-semibold"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload Document
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-yellow-50 border-b border-yellow-100 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">About Personal Documents</p>
                  <p>Upload medical records from other hospitals, previous test results, or health tracking documents. 
                     These documents are for your reference and can be shared with your healthcare provider during consultations.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Documents Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {personalUploads.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Personal Documents</h3>
                <p className="text-gray-500 mb-6">
                  Upload your medical documents from other healthcare providers
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Your First Document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {personalUploads.map((doc) => (
                  <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">
                          {doc.category === 'external_record' ? '🏥' : 
                           doc.category === 'lab_result' ? '🔬' : 
                           doc.category === 'imaging' ? '🩻' :
                           doc.category === 'prescription_other' ? '💊' :
                           doc.category === 'insurance' ? '📑' : '📄'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2 flex-wrap gap-y-2">
                            <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                              Personal Upload
                            </span>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>📅 Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            <span>👤 Uploaded by you</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="text-blue-600 hover:text-blue-700 p-2 transition-colors"
                          title="Download"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-700 p-2 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 sticky top-0">
              <h3 className="text-xl font-bold text-white">Upload Medical Document</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Title *</label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Blood Test Report - Jan 2024"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData({...uploadData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploading}
                  >
                    <option value="external_record">🏥 External Medical Record</option>
                    <option value="lab_result">🔬 Lab Result</option>
                    <option value="imaging">🩻 Imaging Report (X-ray, MRI, etc.)</option>
                    <option value="prescription_other">💊 Prescription (Other Hospital)</option>
                    <option value="insurance">📑 Insurance Document</option>
                    <option value="other">📄 Other Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional notes about this document..."
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        alert('File size exceeds 5MB limit. Please choose a smaller file.');
                        e.target.value = '';
                        return;
                      }
                      setUploadData({...uploadData, file: file});
                    }}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full"
                    disabled={uploading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
                  {uploadData.file && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected file: {(uploadData.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadData({ title: '', category: 'external_record', description: '', file: null });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MedicalReports;