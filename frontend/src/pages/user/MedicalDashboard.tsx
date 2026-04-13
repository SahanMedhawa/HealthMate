// frontend/src/pages/user/MedicalDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import patientAPI from '../../services/patient.api';
import notificationAPI from '../../services/notification.api';
import type {
  MedicalOverview,
  MedicalCondition,
  Diagnosis,
  DoctorPrescription,
  FamilyHistory,
  LifestyleInfo,
  Surgery
} from '../../services/patient.api';
import Navbar from '../../components/user/Navbar';

interface AllergyFormData {
  type: string;
  name: string;
  severity: string;
  reaction: string;
  notes: string;
}

interface StoredAllergy {
  id: string;
  type: string;
  name: string;
  severity: string | null;
  reaction: string;
  notes: string;
  fullString: string;
}

interface NotificationItem {
  _id: string;
  type: string;
  recipient: string;
  recipientType: string;
  status: string;
  subject?: string;
  content: string;
  createdAt: string;
  sentAt?: string;
}

const getSymptomsArray = (symptoms: any): string[] => {
  if (!symptoms) return [];
  if (Array.isArray(symptoms)) return symptoms;
  if (typeof symptoms === 'string') {
    if (symptoms.includes(',')) return symptoms.split(',').map(s => s.trim());
    return [symptoms];
  }
  return [];
};

const MedicalDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<MedicalOverview | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showSurgeryModal, setShowSurgeryModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showLifestyleModal, setShowLifestyleModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<DoctorPrescription | null>(null);
  const [parsedAllergies, setParsedAllergies] = useState<StoredAllergy[]>([]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  const [newCondition, setNewCondition] = useState({ condition: '', diagnosisDate: '', status: 'active', severity: 'moderate', notes: '' });
  const [newAllergy, setNewAllergy] = useState<AllergyFormData>({ type: 'food', name: '', severity: 'moderate', reaction: '', notes: '' });
  const [newSurgery, setNewSurgery] = useState({ procedure: '', date: '', hospital: '', surgeon: '', notes: '' });
  const [newFamily, setNewFamily] = useState({ relationship: '', condition: '', ageAtDiagnosis: '', notes: '' });
  const [lifestyle, setLifestyle] = useState<LifestyleInfo>({});

  const allergyTypes = [
    { value: 'food',   label: 'Food',   icon: '🍕', color: 'bg-orange-100 text-orange-800', borderColor: 'border-orange-300', bgColor: 'bg-orange-50' },
    { value: 'drug',   label: 'Drug',   icon: '💊', color: 'bg-red-100 text-red-800',       borderColor: 'border-red-300',    bgColor: 'bg-red-50'    },
    { value: 'dust',   label: 'Dust',   icon: '🏠', color: 'bg-gray-100 text-gray-800',     borderColor: 'border-gray-300',   bgColor: 'bg-gray-50'   },
    { value: 'pollen', label: 'Pollen', icon: '🌸', color: 'bg-green-100 text-green-800',   borderColor: 'border-green-300',  bgColor: 'bg-green-50'  },
    { value: 'animal', label: 'Animal', icon: '🐕', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-300', bgColor: 'bg-yellow-50' },
    { value: 'insect', label: 'Insect', icon: '🐝', color: 'bg-amber-100 text-amber-800',   borderColor: 'border-amber-300',  bgColor: 'bg-amber-50'  },
    { value: 'latex',  label: 'Latex',  icon: '🧤', color: 'bg-purple-100 text-purple-800', borderColor: 'border-purple-300', bgColor: 'bg-purple-50' },
    { value: 'other',  label: 'Other',  icon: '📌', color: 'bg-blue-100 text-blue-800',     borderColor: 'border-blue-300',   bgColor: 'bg-blue-50'   }
  ];

  const severityOptions = [
    { value: 'mild',     label: 'Mild',     textColor: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300',  dot: 'bg-green-500'  },
    { value: 'moderate', label: 'Moderate', textColor: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', dot: 'bg-yellow-500' },
    { value: 'severe',   label: 'Severe',   textColor: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',    dot: 'bg-red-500'    }
  ];

  const fetchNotifications = async () => {
    try {
      const patientId = overview?.patientInfo?.id;
      const patientEmail = overview?.patientInfo?.email;
      if (patientId) {
        const response = await notificationAPI.getHistory(patientId);
        if (response.success && response.data) {
          const patientNotifications = response.data.filter(
            (n: NotificationItem) => n.recipientType === 'email' && n.recipient === patientEmail
          );
          setNotifications(patientNotifications);
          setUnreadCount(patientNotifications.filter((n: NotificationItem) => n.status === 'sent').length);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current && 
        !notificationRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (overview?.patientInfo?.id) fetchNotifications();
  }, [overview]);

  useEffect(() => { fetchMedicalData(); }, []);

  const encodeAllergyString = (allergy: AllergyFormData): string => {
    let str = `${allergy.type.toUpperCase()}: ${allergy.name}`;
    if (allergy.severity) str += ` (${allergy.severity})`;
    if (allergy.reaction) str += ` [reaction: ${allergy.reaction}]`;
    if (allergy.notes)    str += ` [notes: ${allergy.notes}]`;
    return str;
  };

  const parseAllergyString = (allergyStr: string, index: number): StoredAllergy => {
    const typeMatch   = allergyStr.match(/^(FOOD|DRUG|DUST|POLLEN|ANIMAL|INSECT|LATEX|OTHER):/i);
    const type        = typeMatch ? typeMatch[1].toLowerCase() : 'other';
    const withoutType = allergyStr.replace(/^(FOOD|DRUG|DUST|POLLEN|ANIMAL|INSECT|LATEX|OTHER):\s*/i, '');
    const severityMatch = withoutType.match(/\((\w+)\)/);
    const severity      = severityMatch ? severityMatch[1] : null;
    const reactionMatch = allergyStr.match(/\[reaction:\s*([^\]]+)\]/);
    const reaction      = reactionMatch ? reactionMatch[1].trim() : '';
    const notesMatch    = allergyStr.match(/\[notes:\s*([^\]]+)\]/);
    const notes         = notesMatch ? notesMatch[1].trim() : '';
    const name = withoutType.replace(/\(\w+\)/, '').replace(/\[reaction:[^\]]*\]/, '').replace(/\[notes:[^\]]*\]/, '').trim();
    return { id: `allergy-${index}`, type, name, severity, reaction, notes, fullString: allergyStr };
  };

  const fetchMedicalData = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getMedicalOverview();
      if (response.success) {
        setOverview(response.data);
        setLifestyle(response.data.medicalHistory.lifestyle || {});
        if (response.data.medicalHistory.allergies) {
          setParsedAllergies(response.data.medicalHistory.allergies.map((s: string, i: number) => parseAllergyString(s, i)));
        }
      }
    } catch (error) {
      console.error('Error fetching medical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = async () => {
    if (!newCondition.condition) { alert('Please enter a condition'); return; }
    try {
      await patientAPI.addMedicalCondition(newCondition);
      await fetchMedicalData();
      setShowConditionModal(false);
      setNewCondition({ condition: '', diagnosisDate: '', status: 'active', severity: 'moderate', notes: '' });
      alert('Medical condition added successfully');
    } catch (error) { console.error(error); alert('Failed to add condition'); }
  };

  const addAllergyItem = async () => {
    if (!newAllergy.name) { alert('Please enter the allergy name'); return; }
    try {
      await patientAPI.addAllergy(encodeAllergyString(newAllergy));
      await fetchMedicalData();
      setNewAllergy({ type: 'food', name: '', severity: 'moderate', reaction: '', notes: '' });
      setShowAllergyModal(false);
      alert('Allergy added successfully');
    } catch (error) { console.error(error); alert('Failed to add allergy'); }
  };

  const removeAllergy = async (allergy: string) => {
    if (window.confirm('Are you sure you want to remove this allergy?')) {
      try {
        await patientAPI.removeAllergy(allergy);
        await fetchMedicalData();
        alert('Allergy removed successfully');
      } catch (error) { console.error(error); alert('Failed to remove allergy'); }
    }
  };

  const addSurgeryItem = async () => {
    if (!newSurgery.procedure || !newSurgery.date || !newSurgery.hospital || !newSurgery.surgeon) {
      alert('Please fill in all required fields'); return;
    }
    try {
      await patientAPI.addSurgery(newSurgery);
      await fetchMedicalData();
      setShowSurgeryModal(false);
      setNewSurgery({ procedure: '', date: '', hospital: '', surgeon: '', notes: '' });
      alert('Surgery added successfully');
    } catch (error) { console.error(error); alert('Failed to add surgery'); }
  };

  const addFamilyItem = async () => {
    if (!newFamily.relationship || !newFamily.condition) { alert('Please fill in all required fields'); return; }
    try {
      await patientAPI.addFamilyHistory({ ...newFamily, ageAtDiagnosis: newFamily.ageAtDiagnosis ? parseInt(newFamily.ageAtDiagnosis) : undefined });
      await fetchMedicalData();
      setShowFamilyModal(false);
      setNewFamily({ relationship: '', condition: '', ageAtDiagnosis: '', notes: '' });
      alert('Family history added successfully');
    } catch (error) { console.error(error); alert('Failed to add family history'); }
  };

  const updateLifestyleInfo = async () => {
    try {
      await patientAPI.updateLifestyle(lifestyle);
      await fetchMedicalData();
      setShowLifestyleModal(false);
      alert('Lifestyle information updated successfully');
    } catch (error) { console.error(error); alert('Failed to update lifestyle'); }
  };

  const getAllergyTypeInfo = (type: string) => allergyTypes.find(t => t.value === type) || allergyTypes[7];
  const getSeverityInfo    = (severity: string | null) => severityOptions.find(s => s.value === severity) || null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':   return { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-300',  dot: 'bg-amber-500'  };
      case 'resolved': return { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-300',  dot: 'bg-green-500'  };
      case 'chronic':  return { bg: 'bg-blue-50',   text: 'text-blue-800',   border: 'border-blue-300',   dot: 'bg-blue-500'   };
      default:         return { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-300',   dot: 'bg-gray-400'   };
    }
  };

  const getSeverityStyle = (severity?: string) => {
    switch (severity) {
      case 'mild':     return { bg: 'bg-green-50',  text: 'text-green-800',  border: 'border-green-300'  };
      case 'moderate': return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' };
      case 'severe':   return { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-300'    };
      default:         return { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-300'   };
    }
  };

  const getNotificationIcon  = (type: string) => ({ booking_confirmation: '✅', completion: '📋', reminder: '⏰', cancellation: '❌', reschedule: '🔄' }[type] || '📧');
  const getNotificationTitle = (type: string) => ({ booking_confirmation: 'Appointment Confirmed', completion: 'Consultation Complete', reminder: 'Appointment Reminder', cancellation: 'Appointment Cancelled', reschedule: 'Appointment Rescheduled' }[type] || 'Notification');

  const navTabs = [
    { id: 'overview',      label: 'Overview',       icon: '📊' },
    { id: 'diagnoses',     label: 'Diagnoses',      icon: '🩺' },
    { id: 'prescriptions', label: 'Prescriptions',  icon: '💊' },
    { id: 'conditions',    label: 'Conditions',     icon: '📋' },
    { id: 'allergies',     label: 'Allergies',      icon: '⚠️' },
    { id: 'surgeries',     label: 'Surgeries',      icon: '🔬' },
    { id: 'family',        label: 'Family History', icon: '👨‍👩‍👧' },
    { id: 'lifestyle',     label: 'Lifestyle',      icon: '🏃' }
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="md-loading">
          <div className="md-loading-inner">
            <div className="md-spinner"><div className="md-spinner-ring"></div><div className="md-pulse"></div></div>
            <p className="md-loading-title">Loading Medical Dashboard</p>
            <span className="md-loading-sub">Retrieving your health records…</span>
          </div>
        </div>
      </>
    );
  }

  const inp = "md-modal-input";

  return (
    <>
      <Navbar />
      <div className="md-root">
        <div className="md-bg" aria-hidden="true">
          <div className="md-bg-orb md-bg-orb-1"></div>
          <div className="md-bg-orb md-bg-orb-2"></div>
          <div className="md-bg-grid"></div>
        </div>

        <div className="md-container">

          {/* ── Hero Header ── */}
          <div className="md-hero md-anim">
            <div className="md-hero-banner">
              <div className="md-banner-deco" aria-hidden="true">
                {[...Array(5)].map((_,i) => <div key={i} className={`md-deco-line md-deco-line-${i+1}`}></div>)}
              </div>
              <div className="md-banner-content">
                <div className="md-banner-icon">
                  <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="md-banner-text">
                  <p className="md-banner-label">Health Records</p>
                  <h1 className="md-banner-title">Medical Dashboard</h1>
                  <p className="md-banner-sub">Your complete health record in one secure place</p>
                </div>

                {/* ── NOTIFICATION BELL  ── */}
                <div style={{ position: 'relative' }}>
                  <button
                    ref={notificationButtonRef}
                    onClick={() => { 
                      setShowNotifications(!showNotifications); 
                      if (!showNotifications) fetchNotifications(); 
                    }}
                    className="md-notif-btn"
                    aria-label="Notifications"
                    style={{
                      position: 'relative',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,.15)',
                      backdropFilter: 'blur(8px)',
                      border: '1.5px solid rgba(255,255,255,.25)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    
                    {/* Notification Badge with Count */}
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 5px',
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '999px',
                        border: '2px solid #0c2340',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'monospace'
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            {overview && (
              <div className="md-stats-row">
                {[
                  { value: overview.statistics?.totalDiagnoses || 0,         label: 'Diagnoses',     color: 'md-stat-blue',   icon: '🩺' },
                  { value: overview.statistics?.totalPrescriptions || 0,     label: 'Prescriptions', color: 'md-stat-green',  icon: '💊' },
                  { value: overview.statistics?.totalMedicalReports || 0,    label: 'Reports',       color: 'md-stat-purple', icon: '📄' },
                  { value: overview.statistics?.medicalConditionsCount || 0, label: 'Conditions',    color: 'md-stat-amber',  icon: '📋' },
                  { value: overview.statistics?.allergiesCount || 0,         label: 'Allergies',     color: 'md-stat-red',    icon: '⚠️' }
                ].map((stat, i) => (
                  <div key={i} className={`md-stat-card ${stat.color}`}>
                    <span className="md-stat-emoji">{stat.icon}</span>
                    <span className="md-stat-value">{stat.value}</span>
                    <span className="md-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Nav */}
            <div className="md-tab-scroll">
              <div className="md-tabs">
                {navTabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`md-tab ${activeTab === tab.id ? 'md-tab-active' : ''}`}>
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {activeTab === tab.id && <span className="md-tab-bar"></span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════ OVERVIEW ══════════ */}
          {activeTab === 'overview' && overview && (
            <div className="md-section-grid">
              <div className="md-card md-anim md-anim-d1">
                <div className="md-card-header">
                  <div className="md-card-icon md-icon-blue">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Patient Information</h2>
                    <p className="md-card-sub">Core identity and contact details</p>
                  </div>
                </div>
                <div className="md-info-grid">
                  {[
                    { label: 'Full Name',   value: overview.patientInfo?.name },
                    { label: 'Email',       value: overview.patientInfo?.email },
                    { label: 'Phone',       value: overview.patientInfo?.phoneNumber || 'Not provided' },
                    { label: 'Blood Group', value: overview.patientInfo?.bloodGroup  || 'Not provided' }
                  ].map((item, i) => (
                    <div key={i} className="md-info-item">
                      <p className="md-info-label">{item.label}</p>
                      <p className="md-info-value">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md-card md-anim md-anim-d2">
                <div className="md-card-header">
                  <div className="md-card-icon md-icon-teal">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Recent Diagnoses</h2>
                    <p className="md-card-sub">Latest 3 records</p>
                  </div>
                </div>
                {!overview.diagnoses?.length ? (
                  <div className="md-empty"><span className="md-empty-icon">🩺</span><p>No diagnoses recorded yet</p></div>
                ) : (
                  <div className="md-list">
                    {overview.diagnoses.slice(0, 3).map((diag: Diagnosis) => {
                      const symptomsArray = getSymptomsArray(diag.symptoms);
                      return (
                        <div key={diag.id} className="md-list-item md-list-item-blue">
                          <p className="md-list-title">{diag.diagnosis}</p>
                          <p className="md-list-meta">📅 {new Date(diag.prescribedAt).toLocaleDateString()}</p>
                          {symptomsArray.length > 0 && <p className="md-list-sub">Symptoms: {symptomsArray.join(', ')}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="md-card md-anim md-anim-d3">
                <div className="md-card-header">
                  <div className="md-card-icon md-icon-green">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Active Prescriptions</h2>
                    <p className="md-card-sub">Current medications</p>
                  </div>
                </div>
                {!overview.prescriptions?.length ? (
                  <div className="md-empty"><span className="md-empty-icon">💊</span><p>No active prescriptions</p></div>
                ) : (
                  <div className="md-rx-list">
                    {overview.prescriptions.slice(0, 3).map((pres: DoctorPrescription) => (
                      <div key={pres.id} className="md-rx-item">
                        <div>
                          <p className="md-rx-name">{pres.medicineName}</p>
                          <p className="md-rx-sub">{pres.dosage} · {pres.quantity} units</p>
                        </div>
                        <span className="md-badge-active">Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ DIAGNOSES ══════════ */}
          {activeTab === 'diagnoses' && overview && (
            <div className="md-card md-anim">
              <div className="md-card-header">
                <div className="md-card-icon md-icon-teal">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="md-card-title">All Diagnoses</h2>
                  <p className="md-card-sub">{overview.diagnoses?.length || 0} records on file</p>
                </div>
              </div>
              {!overview.diagnoses?.length ? (
                <div className="md-empty-lg"><span className="md-empty-icon-lg">🩺</span><p>No diagnoses recorded yet</p></div>
              ) : (
                <div className="md-diag-list">
                  {overview.diagnoses.map((diag: Diagnosis) => {
                    const symptomsArray = getSymptomsArray(diag.symptoms);
                    return (
                      <div key={diag.id} className="md-diag-card">
                        <div className="md-diag-stripe"></div>
                        <div className="md-diag-body">
                          <div className="md-diag-top">
                            <h3 className="md-diag-title">{diag.diagnosis}</h3>
                            <span className="md-diag-date">📅 {new Date(diag.prescribedAt).toLocaleDateString()}</span>
                          </div>
                          {symptomsArray.length > 0 && (
                            <div className="md-tag-group">
                              <p className="md-tag-label">Symptoms</p>
                              <div className="md-tags">
                                {symptomsArray.map((s: string, idx: number) => <span key={idx} className="md-tag">{s}</span>)}
                              </div>
                            </div>
                          )}
                          {diag.notes && <p className="md-diag-notes">📝 {diag.notes}</p>}
                          {(diag.drugs?.length ?? 0) > 0 && (
                            <div className="md-drugs">
                              <p className="md-drugs-label">Prescribed Medications</p>
                              <div className="md-drugs-list">
                                {diag.drugs.map((drug, idx) => (
                                  <div key={idx} className="md-drug-item">
                                    <span className="md-drug-name">{drug.name}</span>
                                    <span className="md-drug-detail">{drug.dosage} · {drug.quantity} units</span>
                                    {drug.instructions && <span className="md-drug-note">{drug.instructions}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════ PRESCRIPTIONS ══════════ */}
          {activeTab === 'prescriptions' && overview && (
            <div className="md-card md-anim">
              <div className="md-card-header">
                <div className="md-card-icon md-icon-green">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="md-card-title">All Prescriptions</h2>
                  <p className="md-card-sub">{overview.prescriptions?.length || 0} total prescriptions</p>
                </div>
              </div>
              {!overview.prescriptions?.length ? (
                <div className="md-empty-lg"><span className="md-empty-icon-lg">💊</span><p>No prescriptions available</p></div>
              ) : (
                <div className="md-rx-grid">
                  {overview.prescriptions.map((pres: DoctorPrescription) => (
                    <div key={pres.id} className="md-rx-card" onClick={() => setSelectedPrescription(pres)}>
                      <div className="md-rx-card-top">
                        <div className="md-rx-card-left">
                          <div className="md-rx-pill-icon">💊</div>
                          <div>
                            <h3 className="md-rx-card-name">{pres.medicineName}</h3>
                            <span className="md-badge-active md-badge-sm">Active</span>
                          </div>
                        </div>
                        <button className="md-rx-eye">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                      <div className="md-rx-card-stats">
                        <div className="md-rx-stat"><span className="md-rx-stat-label">Dosage</span><span className="md-rx-stat-val">{pres.dosage}</span></div>
                        <div className="md-rx-stat"><span className="md-rx-stat-label">Qty</span><span className="md-rx-stat-val">{pres.quantity}</span></div>
                        <div className="md-rx-stat"><span className="md-rx-stat-label">Price</span><span className="md-rx-stat-val">${pres.price?.toFixed(2) || '0.00'}</span></div>
                        <div className="md-rx-stat"><span className="md-rx-stat-label">Date</span><span className="md-rx-stat-val">{new Date(pres.prescribedAt).toLocaleDateString()}</span></div>
                      </div>
                      {pres.instructions && <p className="md-rx-instr">📋 {pres.instructions}</p>}
                      <p className="md-rx-for">For: {pres.diagnosis}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ CONDITIONS ══════════ */}
          {activeTab === 'conditions' && overview && (
            <div className="md-card md-anim">
              <div className="md-card-header md-card-header-row">
                <div className="md-card-header-left">
                  <div className="md-card-icon md-icon-amber">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Health Conditions</h2>
                    <p className="md-card-sub">{overview.medicalHistory?.conditions?.length || 0} conditions tracked</p>
                  </div>
                </div>
                <button onClick={() => setShowConditionModal(true)} className="md-add-btn">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add Condition
                </button>
              </div>
              {!overview.medicalHistory?.conditions?.length ? (
                <div className="md-empty-lg"><span className="md-empty-icon-lg">📋</span><p>No health conditions recorded</p></div>
              ) : (
                <div className="md-cond-grid">
                  {overview.medicalHistory.conditions.map((cond: MedicalCondition) => {
                    const st = getStatusStyle(cond.status);
                    const sv = getSeverityStyle(cond.severity);
                    return (
                      <div key={cond.id} className="md-cond-card">
                        <div className="md-cond-top">
                          <h3 className="md-cond-name">{cond.condition}</h3>
                          <div className="md-cond-badges">
                            <span className={`md-pill ${st.bg} ${st.text} border ${st.border}`}><span className={`md-pill-dot ${st.dot}`}></span>{cond.status}</span>
                            {cond.severity && <span className={`md-pill ${sv.bg} ${sv.text} border ${sv.border}`}>{cond.severity}</span>}
                          </div>
                        </div>
                        {cond.diagnosisDate && <p className="md-cond-date">📅 {new Date(cond.diagnosisDate).toLocaleDateString()}</p>}
                        {cond.notes && <p className="md-cond-notes">{cond.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════ ALLERGIES ══════════ */}
          {activeTab === 'allergies' && overview && (
            <div className="md-card md-anim">
              <div className="md-card-header md-card-header-row">
                <div className="md-card-header-left">
                  <div className="md-card-icon md-icon-red">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Allergies</h2>
                    <p className="md-card-sub">Track your allergies by category for safer care</p>
                  </div>
                </div>
                <button onClick={() => setShowAllergyModal(true)} className="md-add-btn md-add-btn-red">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add Allergy
                </button>
              </div>
              {!overview.medicalHistory?.allergies?.length ? (
                <div className="md-empty-lg">
                  <span className="md-empty-icon-lg">⚠️</span>
                  <p>No allergies recorded</p>
                  <span className="md-empty-hint">Click "Add Allergy" to track your allergies</span>
                </div>
              ) : (
                <div className="md-allergy-grid">
                  {parsedAllergies.map((allergy: StoredAllergy) => {
                    const typeInfo = getAllergyTypeInfo(allergy.type);
                    const sevInfo  = getSeverityInfo(allergy.severity);
                    return (
                      <div key={allergy.id} className={`md-allergy-card border ${typeInfo.borderColor} ${typeInfo.bgColor}`}>
                        <div className="md-allergy-top">
                          <div className="md-allergy-left">
                            <span className="md-allergy-emoji">{typeInfo.icon}</span>
                            <div>
                              <h3 className="md-allergy-name">{allergy.name}</h3>
                              <span className={`md-allergy-type-chip ${typeInfo.color}`}>{typeInfo.label} Allergy</span>
                            </div>
                          </div>
                          <div className="md-allergy-right">
                            {sevInfo && (
                              <span className={`md-pill ${sevInfo.bg} ${sevInfo.textColor} border ${sevInfo.border}`}>
                                <span className={`md-pill-dot ${sevInfo.dot}`}></span>{sevInfo.label}
                              </span>
                            )}
                            <button onClick={() => removeAllergy(allergy.fullString)} className="md-allergy-del" title="Remove allergy">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                        {(allergy.reaction || allergy.notes) && (
                          <div className="md-allergy-details">
                            {allergy.reaction && (
                              <div className="md-allergy-detail-row">
                                <span className="md-detail-label">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  Reaction
                                </span>
                                <span className="md-detail-value">{allergy.reaction}</span>
                              </div>
                            )}
                            {allergy.notes && (
                              <div className="md-allergy-detail-row">
                                <span className="md-detail-label">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  Notes
                                </span>
                                <span className="md-detail-value">{allergy.notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="md-info-banner">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <p><strong>Why track allergies?</strong> Accurate allergy records help your care team avoid adverse reactions and provide safer treatments.</p>
              </div>
            </div>
          )}

          {/* ══════════ SURGERIES ══════════ */}
          {activeTab === 'surgeries' && overview && (
            <div className="md-card md-anim">
              <div className="md-card-header md-card-header-row">
                <div className="md-card-header-left">
                  <div className="md-card-icon md-icon-purple">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Surgical History</h2>
                    <p className="md-card-sub">{overview.medicalHistory?.surgeries?.length || 0} procedures recorded</p>
                  </div>
                </div>
                <button onClick={() => setShowSurgeryModal(true)} className="md-add-btn">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add Surgery
                </button>
              </div>
              {!overview.medicalHistory?.surgeries?.length ? (
                <div className="md-empty-lg"><span className="md-empty-icon-lg">🔬</span><p>No surgical history recorded</p></div>
              ) : (
                <div className="md-surgery-list">
                  {overview.medicalHistory.surgeries.map((surgery: Surgery) => (
                    <div key={surgery.id} className="md-surgery-card">
                      <div className="md-surgery-icon-wrap">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <div className="md-surgery-body">
                        <h3 className="md-surgery-title">{surgery.procedure}</h3>
                        <div className="md-surgery-meta">
                          <span>📅 {new Date(surgery.date).toLocaleDateString()}</span>
                          <span>🏥 {surgery.hospital}</span>
                          <span>👨‍⚕️ {surgery.surgeon}</span>
                        </div>
                        {surgery.notes && <p className="md-surgery-notes">{surgery.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ FAMILY ══════════ */}
          {activeTab === 'family' && overview && (
            <div className="md-card md-anim">
              <div className="md-card-header md-card-header-row">
                <div className="md-card-header-left">
                  <div className="md-card-icon md-icon-indigo">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Family Medical History</h2>
                    <p className="md-card-sub">{overview.medicalHistory?.familyHistory?.length || 0} records</p>
                  </div>
                </div>
                <button onClick={() => setShowFamilyModal(true)} className="md-add-btn">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Add Member
                </button>
              </div>
              {!overview.medicalHistory?.familyHistory?.length ? (
                <div className="md-empty-lg"><span className="md-empty-icon-lg">👨‍👩‍👧</span><p>No family history recorded</p></div>
              ) : (
                <div className="md-family-grid">
                  {overview.medicalHistory.familyHistory.map((member: FamilyHistory) => (
                    <div key={member.id} className="md-family-card">
                      <div className="md-family-icon">👤</div>
                      <div className="md-family-body">
                        <h3 className="md-family-rel">{member.relationship}</h3>
                        <p className="md-family-cond">{member.condition}</p>
                        {member.ageAtDiagnosis && <p className="md-family-age">Diagnosed at age {member.ageAtDiagnosis}</p>}
                        {member.notes && <p className="md-family-notes">{member.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ LIFESTYLE ══════════ */}
          {activeTab === 'lifestyle' && (
            <div className="md-card md-anim">
              <div className="md-card-header md-card-header-row">
                <div className="md-card-header-left">
                  <div className="md-card-icon md-icon-teal">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="md-card-title">Lifestyle Information</h2>
                    <p className="md-card-sub">Daily habits and wellness profile</p>
                  </div>
                </div>
                <button onClick={() => setShowLifestyleModal(true)} className="md-add-btn">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit Lifestyle
                </button>
              </div>
              <div className="md-lifestyle-grid">
                {[
                  { label: 'Smoking',      value: lifestyle.smoking,      icon: '🚭' },
                  { label: 'Alcohol',      value: lifestyle.alcohol,      icon: '🍷' },
                  { label: 'Exercise',     value: lifestyle.exercise,     icon: '🏃' },
                  { label: 'Occupation',   value: lifestyle.occupation,   icon: '💼' },
                  { label: 'Sleep Hours',  value: lifestyle.sleepHours ? `${lifestyle.sleepHours} hrs/night` : undefined, icon: '🌙' },
                  { label: 'Stress Level', value: lifestyle.stressLevel,  icon: '🧘' }
                ].map((item, i) => (
                  <div key={i} className="md-lifestyle-card">
                    <span className="md-lifestyle-icon">{item.icon}</span>
                    <div>
                      <p className="md-lifestyle-label">{item.label}</p>
                      <p className="md-lifestyle-value" style={{ textTransform: 'capitalize' }}>
                        {item.value || <span className="md-lifestyle-empty">Not specified</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(lifestyle.dietaryRestrictions && lifestyle.dietaryRestrictions.length > 0) && (
                <div className="md-dietary">
                  <p className="md-dietary-label">🥗 Dietary Restrictions</p>
                  <div className="md-tags">
                    {lifestyle.dietaryRestrictions.map((r: string, i: number) => <span key={i} className="md-tag">{r}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}

      {showConditionModal && (
        <div className="md-modal-overlay">
          <div className="md-modal">
            <div className="md-modal-header md-modal-header-blue">
              <div className="md-modal-header-icon">📋</div>
              <div><h3 className="md-modal-title">Add Health Condition</h3><p className="md-modal-sub">Record a new medical condition</p></div>
              <button onClick={() => setShowConditionModal(false)} className="md-modal-close">✕</button>
            </div>
            <div className="md-modal-body">
              <div className="md-modal-field"><label className="md-label">Condition Name *</label>
                <input type="text" value={newCondition.condition} onChange={e => setNewCondition({...newCondition, condition: e.target.value})} className={inp} placeholder="e.g. Diabetes, Hypertension" /></div>
              <div className="md-modal-field"><label className="md-label">Diagnosis Date</label>
                <input type="date" value={newCondition.diagnosisDate} onChange={e => setNewCondition({...newCondition, diagnosisDate: e.target.value})} className={inp} /></div>
              <div className="md-modal-2col">
                <div className="md-modal-field"><label className="md-label">Status</label>
                  <select value={newCondition.status} onChange={e => setNewCondition({...newCondition, status: e.target.value})} className={inp}>
                    <option value="active">Active</option><option value="resolved">Resolved</option><option value="chronic">Chronic</option>
                  </select></div>
                <div className="md-modal-field"><label className="md-label">Severity</label>
                  <select value={newCondition.severity} onChange={e => setNewCondition({...newCondition, severity: e.target.value})} className={inp}>
                    <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
                  </select></div>
              </div>
              <div className="md-modal-field"><label className="md-label">Notes</label>
                <textarea value={newCondition.notes} onChange={e => setNewCondition({...newCondition, notes: e.target.value})} rows={3} className={inp} placeholder="Additional information…" /></div>
            </div>
            <div className="md-modal-footer">
              <button onClick={() => setShowConditionModal(false)} className="md-btn-ghost">Cancel</button>
              <button onClick={addCondition} className="md-btn-primary">Add Condition</button>
            </div>
          </div>
        </div>
      )}

      {showAllergyModal && (
        <div className="md-modal-overlay">
          <div className="md-modal md-modal-lg">
            <div className="md-modal-header md-modal-header-red">
              <div className="md-modal-header-icon">⚠️</div>
              <div><h3 className="md-modal-title">Add New Allergy</h3><p className="md-modal-sub">Select type and enter details</p></div>
              <button onClick={() => { setShowAllergyModal(false); setNewAllergy({ type: 'food', name: '', severity: 'moderate', reaction: '', notes: '' }); }} className="md-modal-close">✕</button>
            </div>
            <div className="md-modal-body">
              <div className="md-modal-field"><label className="md-label">Allergy Type *</label>
                <div className="md-type-grid">
                  {allergyTypes.map(type => (
                    <button key={type.value} type="button" onClick={() => setNewAllergy({...newAllergy, type: type.value})}
                      className={`md-type-btn ${newAllergy.type === type.value ? `${type.color} border-blue-400 ring-2 ring-blue-200` : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} border-2 rounded-xl p-3 flex flex-col items-center gap-1 transition-all`}>
                      <span className="text-xl">{type.icon}</span><span className="text-xs font-semibold">{type.label}</span>
                    </button>
                  ))}
                </div></div>
              <div className="md-modal-field"><label className="md-label">Allergy Name *</label>
                <input type="text" value={newAllergy.name} onChange={e => setNewAllergy({...newAllergy, name: e.target.value})} className={inp}
                  placeholder={newAllergy.type === 'food' ? 'e.g. Peanuts, Shellfish, Eggs' : newAllergy.type === 'drug' ? 'e.g. Penicillin, Aspirin' : newAllergy.type === 'pollen' ? 'e.g. Grass pollen, Ragweed' : 'Enter allergy name'} /></div>
              <div className="md-modal-field"><label className="md-label">Severity</label>
                <div className="md-sev-row">
                  {severityOptions.map(sev => (
                    <button key={sev.value} type="button" onClick={() => setNewAllergy({...newAllergy, severity: sev.value})}
                      className={`md-sev-btn border-2 rounded-xl py-2.5 flex-1 flex items-center justify-center gap-2 transition-all font-semibold text-sm ${newAllergy.severity === sev.value ? `${sev.bg} ${sev.textColor} ${sev.border} ring-2 ring-offset-1` : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${sev.dot}`}></span>{sev.label}
                    </button>
                  ))}
                </div></div>
              <div className="md-modal-field"><label className="md-label">Reaction / Symptoms <span className="md-opt">(optional)</span></label>
                <textarea value={newAllergy.reaction} onChange={e => setNewAllergy({...newAllergy, reaction: e.target.value})} rows={2} className={inp} placeholder="e.g. Hives, Swelling, Difficulty breathing, Rash" />
                <p className="md-hint">Helps providers understand the severity and nature of your reaction</p></div>
              <div className="md-modal-field"><label className="md-label">Additional Notes <span className="md-opt">(optional)</span></label>
                <textarea value={newAllergy.notes} onChange={e => setNewAllergy({...newAllergy, notes: e.target.value})} rows={2} className={inp} placeholder="Any additional context about this allergy…" /></div>
              <p className="md-modal-disclaimer">⚕️ Please consult your doctor for proper allergy diagnosis and management.</p>
            </div>
            <div className="md-modal-footer">
              <button onClick={() => { setShowAllergyModal(false); setNewAllergy({ type: 'food', name: '', severity: 'moderate', reaction: '', notes: '' }); }} className="md-btn-ghost">Cancel</button>
              <button onClick={addAllergyItem} className="md-btn-primary md-btn-red">Add Allergy</button>
            </div>
          </div>
        </div>
      )}

      {showSurgeryModal && (
        <div className="md-modal-overlay">
          <div className="md-modal">
            <div className="md-modal-header md-modal-header-purple">
              <div className="md-modal-header-icon">🔬</div>
              <div><h3 className="md-modal-title">Add Surgery</h3><p className="md-modal-sub">Record a surgical procedure</p></div>
              <button onClick={() => setShowSurgeryModal(false)} className="md-modal-close">✕</button>
            </div>
            <div className="md-modal-body">
              <div className="md-modal-field"><label className="md-label">Procedure *</label><input type="text" value={newSurgery.procedure} onChange={e => setNewSurgery({...newSurgery, procedure: e.target.value})} className={inp} placeholder="e.g. Appendectomy" /></div>
              <div className="md-modal-field"><label className="md-label">Date *</label><input type="date" value={newSurgery.date} onChange={e => setNewSurgery({...newSurgery, date: e.target.value})} className={inp} /></div>
              <div className="md-modal-field"><label className="md-label">Hospital *</label><input type="text" value={newSurgery.hospital} onChange={e => setNewSurgery({...newSurgery, hospital: e.target.value})} className={inp} placeholder="Hospital name" /></div>
              <div className="md-modal-field"><label className="md-label">Surgeon *</label><input type="text" value={newSurgery.surgeon} onChange={e => setNewSurgery({...newSurgery, surgeon: e.target.value})} className={inp} placeholder="Surgeon name" /></div>
              <div className="md-modal-field"><label className="md-label">Notes</label><textarea value={newSurgery.notes} onChange={e => setNewSurgery({...newSurgery, notes: e.target.value})} rows={3} className={inp} placeholder="Additional information…" /></div>
            </div>
            <div className="md-modal-footer">
              <button onClick={() => setShowSurgeryModal(false)} className="md-btn-ghost">Cancel</button>
              <button onClick={addSurgeryItem} className="md-btn-primary">Add Surgery</button>
            </div>
          </div>
        </div>
      )}

      {showFamilyModal && (
        <div className="md-modal-overlay">
          <div className="md-modal">
            <div className="md-modal-header md-modal-header-indigo">
              <div className="md-modal-header-icon">👨‍👩‍👧</div>
              <div><h3 className="md-modal-title">Add Family History</h3><p className="md-modal-sub">Record a family member's medical history</p></div>
              <button onClick={() => setShowFamilyModal(false)} className="md-modal-close">✕</button>
            </div>
            <div className="md-modal-body">
              <div className="md-modal-field"><label className="md-label">Relationship *</label><input type="text" value={newFamily.relationship} onChange={e => setNewFamily({...newFamily, relationship: e.target.value})} className={inp} placeholder="e.g. Mother, Father, Brother" /></div>
              <div className="md-modal-field"><label className="md-label">Condition *</label><input type="text" value={newFamily.condition} onChange={e => setNewFamily({...newFamily, condition: e.target.value})} className={inp} placeholder="e.g. Diabetes, Heart Disease" /></div>
              <div className="md-modal-field"><label className="md-label">Age at Diagnosis</label><input type="number" value={newFamily.ageAtDiagnosis} onChange={e => setNewFamily({...newFamily, ageAtDiagnosis: e.target.value})} className={inp} placeholder="Age when diagnosed" /></div>
              <div className="md-modal-field"><label className="md-label">Notes</label><textarea value={newFamily.notes} onChange={e => setNewFamily({...newFamily, notes: e.target.value})} rows={3} className={inp} placeholder="Additional information…" /></div>
            </div>
            <div className="md-modal-footer">
              <button onClick={() => setShowFamilyModal(false)} className="md-btn-ghost">Cancel</button>
              <button onClick={addFamilyItem} className="md-btn-primary">Add Family History</button>
            </div>
          </div>
        </div>
      )}

      {showLifestyleModal && (
        <div className="md-modal-overlay">
          <div className="md-modal">
            <div className="md-modal-header md-modal-header-teal">
              <div className="md-modal-header-icon">🏃</div>
              <div><h3 className="md-modal-title">Edit Lifestyle</h3><p className="md-modal-sub">Update your wellness and daily habits</p></div>
              <button onClick={() => setShowLifestyleModal(false)} className="md-modal-close">✕</button>
            </div>
            <div className="md-modal-body">
              <div className="md-modal-2col">
                <div className="md-modal-field"><label className="md-label">Smoking</label>
                  <select value={lifestyle.smoking || ''} onChange={e => setLifestyle({...lifestyle, smoking: e.target.value as 'never' | 'former' | 'current'})} className={inp}>
                    <option value="">Select</option><option value="never">Never Smoked</option><option value="former">Former Smoker</option><option value="current">Current Smoker</option>
                  </select></div>
                <div className="md-modal-field"><label className="md-label">Alcohol</label>
                  <select value={lifestyle.alcohol || ''} onChange={e => setLifestyle({...lifestyle, alcohol: e.target.value as 'never' | 'occasional' | 'moderate' | 'heavy'})} className={inp}>
                    <option value="">Select</option><option value="never">Never</option><option value="occasional">Occasional</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option>
                  </select></div>
                <div className="md-modal-field"><label className="md-label">Exercise</label>
                  <select value={lifestyle.exercise || ''} onChange={e => setLifestyle({...lifestyle, exercise: e.target.value as 'sedentary' | 'light' | 'moderate' | 'active'})} className={inp}>
                    <option value="">Select</option><option value="sedentary">Sedentary</option><option value="light">Light Exercise</option><option value="moderate">Moderate Exercise</option><option value="active">Very Active</option>
                  </select></div>
                <div className="md-modal-field"><label className="md-label">Stress Level</label>
                  <select value={lifestyle.stressLevel || ''} onChange={e => setLifestyle({...lifestyle, stressLevel: e.target.value as 'low' | 'moderate' | 'high'})} className={inp}>
                    <option value="">Select</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
                  </select></div>
              </div>
              <div className="md-modal-2col">
                <div className="md-modal-field"><label className="md-label">Occupation</label>
                  <input type="text" value={lifestyle.occupation || ''} onChange={e => setLifestyle({...lifestyle, occupation: e.target.value})} className={inp} placeholder="Your occupation" /></div>
                <div className="md-modal-field"><label className="md-label">Sleep Hours / Night</label>
                  <input type="number" value={lifestyle.sleepHours || ''} onChange={e => setLifestyle({...lifestyle, sleepHours: parseInt(e.target.value) || undefined})} className={inp} placeholder="e.g. 7" /></div>
              </div>
            </div>
            <div className="md-modal-footer">
              <button onClick={() => setShowLifestyleModal(false)} className="md-btn-ghost">Cancel</button>
              <button onClick={updateLifestyleInfo} className="md-btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {selectedPrescription && (
        <div className="md-modal-overlay">
          <div className="md-modal">
            <div className="md-modal-header md-modal-header-green">
              <div className="md-modal-header-icon">💊</div>
              <div><h3 className="md-modal-title">Prescription Details</h3><p className="md-modal-sub">{selectedPrescription.medicineName}</p></div>
              <button onClick={() => setSelectedPrescription(null)} className="md-modal-close">✕</button>
            </div>
            <div className="md-modal-body">
              <div className="md-detail-grid">
                {[
                  { label: 'Medicine',        value: selectedPrescription.medicineName },
                  { label: 'Dosage',          value: selectedPrescription.dosage },
                  { label: 'Quantity',        value: `${selectedPrescription.quantity} units` },
                  { label: 'Price',           value: `$${selectedPrescription.price?.toFixed(2) || '0.00'}` },
                  { label: 'Prescribed For',  value: selectedPrescription.diagnosis },
                  { label: 'Prescribed Date', value: new Date(selectedPrescription.prescribedAt).toLocaleString() },
                ].map((item, i) => (
                  <div key={i} className="md-detail-item"><p className="md-detail-label">{item.label}</p><p className="md-detail-value">{item.value}</p></div>
                ))}
                <div className="md-detail-item md-detail-full">
                  <p className="md-detail-label">Instructions</p>
                  <p className="md-detail-value">{selectedPrescription.instructions || 'Take as directed by your doctor'}</p>
                </div>
              </div>
            </div>
            <div className="md-modal-footer">
              <button onClick={() => setSelectedPrescription(null)} className="md-btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          <div 
            onClick={() => setShowNotifications(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          />
          
          {/* Dropdown Box */}
          <div 
            ref={notificationRef}
            style={{ 
              position: 'fixed',
              top: '80px',
              right: '20px',
              zIndex: 9999,
              width: '420px',
              maxWidth: 'calc(100vw - 40px)',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'slideIn 0.25s ease-out'
            }}
          >
            {/* Header with gradient */}
            <div style={{ 
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #0c2340 0%, #1a3d5c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>🔔</span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Notifications</h3>
                  <p style={{ fontSize: '12px', opacity: 0.75, margin: '4px 0 0 0' }}>
                    {notifications.length} notification{notifications.length !== 1 ? 's' : ''} for you
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                ✕
              </button>
            </div>
            
            {/* Notification List */}
            <div style={{ 
              maxHeight: '450px', 
              overflowY: 'auto',
              overflowX: 'hidden'
            }}>
              {notifications.length === 0 ? (
                <div style={{ 
                  padding: '60px 24px', 
                  textAlign: 'center',
                  color: '#94a3b8'
                }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    margin: '0 auto 20px',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '40px' }}>📭</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', color: '#334155' }}>No notifications yet</p>
                  <p style={{ fontSize: '13px' }}>When you receive notifications, they'll appear here</p>
                </div>
              ) : (
                notifications.map((notif, idx) => {
                  const isRecent = new Date(notif.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return (
                    <div 
                      key={notif._id || idx} 
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px 20px',
                        borderBottom: '1px solid #f0f2f5',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        background: isRecent ? '#f0f9ff' : '#ffffff',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isRecent ? '#e0f2fe' : '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isRecent ? '#f0f9ff' : '#ffffff'}
                    >
                      {/* Recent indicator dot */}
                      {isRecent && (
                        <span style={{
                          position: 'absolute',
                          left: '12px',
                          top: '20px',
                          width: '8px',
                          height: '8px',
                          background: '#3b82f6',
                          borderRadius: '50%'
                        }} />
                      )}
                      
                      <span style={{ fontSize: '28px', flexShrink: 0 }}>
                        {getNotificationIcon(notif.type)}
                      </span>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <p style={{ 
                            fontSize: '14px', 
                            fontWeight: isRecent ? 700 : 600, 
                            color: '#0f172a', 
                            margin: 0 
                          }}>
                            {getNotificationTitle(notif.type)}
                          </p>
                          {isRecent && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              background: '#3b82f6',
                              color: '#fff',
                              borderRadius: '12px'
                            }}>
                              New
                            </span>
                          )}
                        </div>
                        
                        <p style={{ 
                          fontSize: '13px', 
                          color: '#475569', 
                          lineHeight: 1.5, 
                          marginBottom: '8px' 
                        }}>
                          {notif.content}
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🕐</span> {new Date(notif.createdAt).toLocaleString()}
                          </span>
                          {notif.status === 'sent' && (
                            <span style={{ 
                              fontSize: '10px', 
                              color: '#10b981', 
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <span>✓</span> Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        /* ── Variables ── */
        :root {
          --navy:       #0c2340;
          --navy-mid:   #1a3d5c;
          --navy-light: #2a5f8a;
          --surface:    #ffffff;
          --surface-2:  #f5f8fc;
          --surface-3:  #eef3f9;
          --border:     #dce6f0;
          --border-2:   #c8d9eb;
          --text-1:     #0c2340;
          --text-2:     #3d5a73;
          --text-3:     #6b8499;
          --text-4:     #9ab0c2;
          --shadow-sm:  0 1px 3px rgba(12,35,64,.06), 0 4px 12px rgba(12,35,64,.04);
          --shadow-md:  0 4px 16px rgba(12,35,64,.08), 0 12px 32px rgba(12,35,64,.05);
          --shadow-lg:  0 8px 32px rgba(12,35,64,.12), 0 24px 48px rgba(12,35,64,.08);
          --radius-sm:  10px;
          --radius-md:  16px;
          --radius-lg:  22px;
        }

        /* ── Root ── */
        .md-root {
          min-height: 100vh;
          background: linear-gradient(160deg, #e8f0f9 0%, #f5f8fc 40%, #eef3f9 100%);
          padding: 2rem 1.25rem 5rem;
          margin-top: 64px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Background ── */
        .md-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .md-bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.2; }
        .md-bg-orb-1 { width: 900px; height: 900px; background: radial-gradient(circle, #a8c8f0, transparent 70%); top: -350px; right: -200px; }
        .md-bg-orb-2 { width: 700px; height: 700px; background: radial-gradient(circle, #b8d4f0, transparent 70%); bottom: -200px; left: -200px; }
        .md-bg-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(42,95,138,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(42,95,138,.035) 1px, transparent 1px);
          background-size: 52px 52px;
        }

        /* ── Container ── */
        .md-container { max-width: 1280px; margin: 0 auto; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1.5rem; }

        /* ── Animations ── */
        @keyframes mdIn { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .md-anim    { animation: mdIn .45s cubic-bezier(.22,1,.36,1) both; }
        .md-anim-d1 { animation-delay: .07s; }
        .md-anim-d2 { animation-delay: .14s; }
        .md-anim-d3 { animation-delay: .21s; }
        @keyframes mdSpin  { to { transform: rotate(360deg); } }
        @keyframes mdPulse { 0%,100%{transform:scale(.8);opacity:.7;} 50%{transform:scale(1.2);opacity:1;} }
        @keyframes mdSlideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }

        /* ── Loading ── */
        .md-loading { display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f8fc;margin-top:64px;font-family:'Plus Jakarta Sans',sans-serif; }
        .md-loading-inner { text-align:center; }
        .md-spinner { position:relative;width:64px;height:64px;margin:0 auto 1.5rem; }
        .md-spinner-ring { width:64px;height:64px;border:3px solid #dce6f0;border-top-color:var(--navy-light);border-radius:50%;animation:mdSpin .8s linear infinite; }
        .md-pulse { position:absolute;inset:0;margin:auto;width:12px;height:12px;background:var(--navy-light);border-radius:50%;animation:mdPulse 1.6s ease-in-out infinite; }
        .md-loading-title { font-size:1.125rem;font-weight:700;color:var(--text-1);margin-bottom:.5rem; }
        .md-loading-sub { font-size:.875rem;color:var(--text-3); }

        /* ── Hero ── */
        .md-hero {
          background:var(--surface); border-radius:var(--radius-lg);
          box-shadow:var(--shadow-md); overflow:hidden;
          border:1px solid var(--border);
        }
        .md-hero-banner {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 55%, var(--navy-light) 100%);
          padding: 2.25rem 2.5rem; position:relative; overflow:hidden;
        }
        .md-banner-deco { position:absolute;inset:0; }
        .md-deco-line { position:absolute;background:rgba(255,255,255,.07);border-radius:2px; }
        .md-deco-line-1 { width:4px;height:140%;left:10%;transform:rotate(14deg); }
        .md-deco-line-2 { width:2px;height:80%;left:22%;top:-10%;transform:rotate(14deg); }
        .md-deco-line-3 { width:1.5px;height:100%;left:38%;transform:rotate(14deg); }
        .md-deco-line-4 { width:3px;height:130%;right:25%;transform:rotate(-10deg); }
        .md-deco-line-5 { width:45%;height:1.5px;bottom:18%;left:0; }
        .md-banner-content { position:relative;display:flex;align-items:center;gap:1.75rem; }
        .md-banner-icon {
          width:76px;height:76px;border-radius:20px;
          background:rgba(255,255,255,.13);backdrop-filter:blur(10px);
          border:1.5px solid rgba(255,255,255,.25);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;
        }
        .md-banner-text { flex:1; }
        .md-banner-label { font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:.3rem; }
        .md-banner-title { font-size:2.1rem;font-weight:800;color:#fff;margin:0 0 .3rem;letter-spacing:-.025em; }
        .md-banner-sub { font-size:.95rem;color:rgba(255,255,255,.65); }

        /* ── Notification wrap ── */
        .md-notif-wrap { position:relative; flex-shrink:0; }
        .md-notif-btn {
          position:relative;width:48px;height:48px;border-radius:50%;
          background:rgba(255,255,255,.15);backdrop-filter:blur(8px);
          border:1.5px solid rgba(255,255,255,.25);
          color:#fff;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          transition:all .2s;
        }
        .md-notif-btn:hover { background:rgba(255,255,255,.25); transform:scale(1.05); }
        .md-notif-badge {
          position:absolute;top:-3px;right:-3px;
          min-width:20px;height:20px;padding:0 5px;
          background:#ef4444;color:#fff;
          font-size:.7rem;font-weight:800;
          border-radius:999px;border:2px solid var(--navy);
          display:flex;align-items:center;justify-content:center;
          font-family:'JetBrains Mono',monospace;
        }

        /* ── Notification Dropdown FIXED ── */
        

        /* ── Notification Bell Button ── */
.md-notif-btn {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(8px);
  border: 1.5px solid rgba(255,255,255,.25);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s;
}

.md-notif-btn:hover {
  background: rgba(255,255,255,.25);
  transform: scale(1.05);
}

/* Notification Badge - Shows the count */
.md-notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  border: 2px solid #0c2340;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  z-index: 10;
}

/* Dropdown animation */
@keyframes mdSlideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

        /* Rest of the CSS remains exactly as in your original file */
        /* ── Stats ── */
        .md-stats-row { display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--border); }
        @media(max-width:640px){ .md-stats-row { grid-template-columns:repeat(3,1fr); } }
        .md-stat-card {
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:1.5rem .5rem;gap:.25rem;
          border-right:1px solid var(--border);transition:background .2s;
        }
        .md-stat-card:last-child { border-right:none; }
        .md-stat-card:hover { background:var(--surface-2); }
        .md-stat-emoji { font-size:1.5rem;margin-bottom:.25rem; }
        .md-stat-value { font-size:1.9rem;font-weight:800;letter-spacing:-.03em;font-family:'JetBrains Mono',monospace; }
        .md-stat-label { font-size:.775rem;font-weight:600;color:var(--text-3);text-align:center;letter-spacing:.01em; }
        .md-stat-blue .md-stat-value   { color:#1d4ed8; }
        .md-stat-green .md-stat-value  { color:#15803d; }
        .md-stat-purple .md-stat-value { color:#6d28d9; }
        .md-stat-amber .md-stat-value  { color:#b45309; }
        .md-stat-red .md-stat-value    { color:#b91c1c; }

        /* ── Tab Nav ── */
        .md-tab-scroll { overflow-x:auto;border-top:1px solid var(--border);background:var(--surface-2); }
        .md-tabs { display:flex;padding:0 1.75rem;min-width:max-content;gap:.25rem; }
        .md-tab {
          display:inline-flex;align-items:center;gap:.5rem;
          padding:1rem 1.25rem;font-size:.9rem;font-weight:600;
          color:var(--text-3);background:none;border:none;cursor:pointer;
          position:relative;transition:all .2s;white-space:nowrap;
          font-family:'Plus Jakarta Sans',sans-serif;border-radius:10px 10px 0 0;
        }
        .md-tab:hover { color:var(--navy-mid);background:rgba(42,95,138,.06); }
        .md-tab-active { color:var(--navy) !important;font-weight:700;background:rgba(42,95,138,.08); }
        .md-tab-bar { position:absolute;bottom:0;left:.5rem;right:.5rem;height:3px;background:var(--navy-light);border-radius:3px 3px 0 0; }

        /* ── Cards ── */
        .md-card {
          background:var(--surface);border-radius:var(--radius-lg);
          box-shadow:var(--shadow-sm);overflow:hidden;border:1px solid var(--border);
          padding:2.25rem;
        }
        .md-section-grid { display:flex;flex-direction:column;gap:1.5rem; }
        .md-card-header {
          display:flex;align-items:center;gap:1.25rem;
          margin-bottom:2rem;padding-bottom:1.5rem;
          border-bottom:2px solid var(--surface-3);
        }
        .md-card-header-row { justify-content:space-between;flex-wrap:wrap; }
        .md-card-header-left { display:flex;align-items:center;gap:1.25rem; }
        .md-card-icon { width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .md-icon-blue   { background:#dbeafe;color:#1d4ed8; }
        .md-icon-teal   { background:#ccfbf1;color:#0d9488; }
        .md-icon-green  { background:#dcfce7;color:#15803d; }
        .md-icon-amber  { background:#fef3c7;color:#b45309; }
        .md-icon-red    { background:#fee2e2;color:#b91c1c; }
        .md-icon-purple { background:#ede9fe;color:#6d28d9; }
        .md-icon-indigo { background:#e0e7ff;color:#3730a3; }
        .md-card-title { font-size:1.2rem;font-weight:800;color:var(--text-1);margin:0 0 .25rem;letter-spacing:-.02em; }
        .md-card-sub   { font-size:.85rem;color:var(--text-3);margin:0;font-weight:500; }

        /* ── Add Button ── */
        .md-add-btn {
          display:inline-flex;align-items:center;gap:.5rem;
          padding:.65rem 1.35rem;border-radius:12px;
          font-size:.875rem;font-weight:700;
          color:#fff;background:linear-gradient(135deg,var(--navy),var(--navy-light));
          border:none;cursor:pointer;
          box-shadow:0 2px 8px rgba(12,35,64,.2);
          transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif;
        }
        .md-add-btn:hover { background:linear-gradient(135deg,#081828,var(--navy-mid));transform:translateY(-1px);box-shadow:0 4px 16px rgba(12,35,64,.25); }
        .md-add-btn-red { background:linear-gradient(135deg,#b91c1c,#dc2626);box-shadow:0 2px 8px rgba(185,28,28,.2); }
        .md-add-btn-red:hover { background:linear-gradient(135deg,#991b1b,#b91c1c); }

        /* ── Info Grid (Overview) ── */
        .md-info-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem; }
        @media(min-width:768px){ .md-info-grid { grid-template-columns:repeat(4,1fr); } }
        .md-info-item { background:var(--surface-2);border-radius:var(--radius-sm);padding:1.25rem;border:1px solid var(--border);transition:all .2s; }
        .md-info-item:hover { border-color:var(--border-2);background:#fff;box-shadow:var(--shadow-sm); }
        .md-info-label { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:.5rem; }
        .md-info-value { font-size:1rem;font-weight:700;color:var(--text-1); }

        /* ── List Items ── */
        .md-list { display:flex;flex-direction:column;gap:1rem; }
        .md-list-item { padding:1.1rem 1.25rem;border-radius:var(--radius-sm);background:var(--surface-2);border:1px solid var(--border);border-left:4px solid transparent;transition:all .2s; }
        .md-list-item:hover { background:#fff;box-shadow:var(--shadow-sm); }
        .md-list-item-blue { border-left-color:#1d4ed8; }
        .md-list-title { font-weight:700;color:var(--text-1);font-size:.975rem;margin-bottom:.3rem; }
        .md-list-meta  { font-size:.825rem;color:var(--text-3); }
        .md-list-sub   { font-size:.825rem;color:var(--text-2);margin-top:.3rem; }

        /* ── Rx List ── */
        .md-rx-list { display:flex;flex-direction:column;gap:.875rem; }
        .md-rx-item { display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:var(--surface-2);border-radius:var(--radius-sm);border:1px solid var(--border);transition:all .2s; }
        .md-rx-item:hover { background:#fff;box-shadow:var(--shadow-sm); }
        .md-rx-name { font-weight:700;color:var(--text-1);font-size:.975rem; }
        .md-rx-sub  { font-size:.825rem;color:var(--text-3);margin-top:.2rem; }
        .md-badge-active { font-size:.72rem;font-weight:700;padding:.275rem .8rem;border-radius:999px;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;letter-spacing:.03em; }
        .md-badge-sm { font-size:.68rem;padding:.2rem .65rem; }

        /* ── Rx Cards ── */
        .md-rx-grid { display:grid;grid-template-columns:1fr;gap:1.25rem; }
        @media(min-width:768px){ .md-rx-grid { grid-template-columns:repeat(2,1fr); } }
        .md-rx-card { border:1px solid var(--border);border-radius:var(--radius-md);padding:1.5rem;cursor:pointer;transition:all .2s;background:#fff; }
        .md-rx-card:hover { border-color:var(--border-2);box-shadow:var(--shadow-md);transform:translateY(-2px); }
        .md-rx-card-top { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.1rem; }
        .md-rx-card-left { display:flex;align-items:center;gap:.875rem; }
        .md-rx-pill-icon { font-size:2rem; }
        .md-rx-card-name { font-size:1.05rem;font-weight:800;color:var(--text-1);margin-bottom:.3rem; }
        .md-rx-eye { color:var(--text-4);padding:.3rem;border-radius:8px;border:none;background:none;cursor:pointer;transition:color .2s; }
        .md-rx-eye:hover { color:var(--navy-light); }
        .md-rx-card-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:.625rem;margin-bottom:.875rem; }
        .md-rx-stat { background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:.6rem .75rem; }
        .md-rx-stat-label { font-size:.68rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.2rem; }
        .md-rx-stat-val { font-size:.9rem;font-weight:700;color:var(--text-1);font-family:'JetBrains Mono',monospace; }
        .md-rx-instr { font-size:.85rem;color:var(--text-2);background:var(--surface-2);border-radius:8px;padding:.6rem .875rem;margin-bottom:.625rem; }
        .md-rx-for { font-size:.825rem;color:var(--text-3);font-weight:500; }

        /* ── Diagnoses ── */
        .md-diag-list { display:flex;flex-direction:column;gap:1.25rem; }
        .md-diag-card { display:flex;border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;transition:all .2s;background:#fff; }
        .md-diag-card:hover { box-shadow:var(--shadow-md);border-color:var(--border-2); }
        .md-diag-stripe { width:5px;background:linear-gradient(180deg,#1d4ed8,#4f46e5);flex-shrink:0; }
        .md-diag-body { padding:1.5rem;flex:1; }
        .md-diag-top { display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.75rem;margin-bottom:1rem; }
        .md-diag-title { font-size:1.05rem;font-weight:800;color:var(--text-1); }
        .md-diag-date { font-size:.825rem;color:var(--text-3);font-weight:500;white-space:nowrap; }
        .md-diag-notes { font-size:.875rem;color:var(--text-2);margin-top:.75rem;line-height:1.6; }
        .md-tag-group { margin-top:.875rem; }
        .md-tag-label { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:.5rem; }
        .md-tags { display:flex;flex-wrap:wrap;gap:.5rem; }
        .md-tag { font-size:.825rem;font-weight:600;padding:.3rem .875rem;border-radius:999px;background:var(--surface-3);color:var(--text-2);border:1px solid var(--border); }
        .md-drugs { margin-top:1.1rem;padding-top:1.1rem;border-top:1px dashed var(--border); }
        .md-drugs-label { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:.75rem; }
        .md-drugs-list { display:flex;flex-direction:column;gap:.625rem; }
        .md-drug-item { display:flex;flex-wrap:wrap;gap:.5rem;align-items:center; }
        .md-drug-name   { font-size:.9rem;font-weight:700;color:var(--text-1); }
        .md-drug-detail { font-size:.825rem;color:var(--text-2); }
        .md-drug-note   { font-size:.8rem;color:var(--text-3);font-style:italic; }

        /* ── Conditions ── */
        .md-cond-grid { display:grid;grid-template-columns:1fr;gap:1.1rem; }
        @media(min-width:768px){ .md-cond-grid { grid-template-columns:repeat(2,1fr); } }
        .md-cond-card { border:1px solid var(--border);border-radius:var(--radius-md);padding:1.5rem;background:#fff;transition:all .2s; }
        .md-cond-card:hover { box-shadow:var(--shadow-md);border-color:var(--border-2); }
        .md-cond-top { display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.875rem;margin-bottom:.75rem; }
        .md-cond-name   { font-size:1.05rem;font-weight:800;color:var(--text-1); }
        .md-cond-badges { display:flex;gap:.5rem;flex-wrap:wrap; }
        .md-cond-date   { font-size:.825rem;color:var(--text-3);font-weight:500;margin-bottom:.5rem; }
        .md-cond-notes  { font-size:.875rem;color:var(--text-2);line-height:1.6; }

        /* ── Pills ── */
        .md-pill { display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .8rem;border-radius:999px;font-size:.775rem;font-weight:700;letter-spacing:.02em; }
        .md-pill-dot { width:7px;height:7px;border-radius:50%;flex-shrink:0; }

        /* ── Allergies ── */
        .md-allergy-grid { display:grid;grid-template-columns:1fr;gap:1.1rem;margin-bottom:1.5rem; }
        @media(min-width:640px){ .md-allergy-grid { grid-template-columns:repeat(2,1fr); } }
        .md-allergy-card { border-radius:var(--radius-md);padding:1.35rem;border-width:1.5px;border-style:solid;transition:all .2s;background:#fff; }
        .md-allergy-card:hover { transform:translateY(-2px);box-shadow:var(--shadow-md); }
        .md-allergy-top { display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem; }
        .md-allergy-left { display:flex;align-items:flex-start;gap:1rem;flex:1; }
        .md-allergy-emoji { font-size:2rem;flex-shrink:0;line-height:1; }
        .md-allergy-name { font-size:1rem;font-weight:800;color:var(--text-1);margin-bottom:.3rem; }
        .md-allergy-type-chip { font-size:.72rem;font-weight:700;padding:.2rem .65rem;border-radius:999px; }
        .md-allergy-right { display:flex;align-items:center;gap:.625rem;flex-shrink:0; }
        .md-allergy-del { width:30px;height:30px;border-radius:50%;background:rgba(185,28,28,.1);color:#b91c1c;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s; }
        .md-allergy-del:hover { background:rgba(185,28,28,.2);transform:scale(1.1); }
        .md-allergy-details { margin-top:1rem;padding-top:1rem;border-top:1px dashed rgba(0,0,0,.12);display:flex;flex-direction:column;gap:.5rem; }
        .md-allergy-detail-row { display:flex;align-items:flex-start;gap:.75rem; }
        .md-detail-label { display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);flex-shrink:0;min-width:78px;margin-top:.05rem; }
        .md-detail-value { font-size:.875rem;color:var(--text-2);line-height:1.6; }
        .md-info-banner { display:flex;align-items:flex-start;gap:1rem;padding:1.1rem 1.5rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius-sm);font-size:.875rem;color:#1e3a8a;line-height:1.6;font-weight:500; }

        /* ── Surgeries ── */
        .md-surgery-list { display:flex;flex-direction:column;gap:1.1rem; }
        .md-surgery-card { display:flex;align-items:flex-start;gap:1.25rem;border:1px solid var(--border);border-radius:var(--radius-md);padding:1.5rem;background:#fff;transition:all .2s; }
        .md-surgery-card:hover { box-shadow:var(--shadow-md);border-color:var(--border-2); }
        .md-surgery-icon-wrap { width:52px;height:52px;border-radius:15px;background:#ede9fe;border:1px solid #ddd6fe;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .md-surgery-body { flex:1; }
        .md-surgery-title { font-size:1.05rem;font-weight:800;color:var(--text-1);margin-bottom:.625rem; }
        .md-surgery-meta { display:flex;flex-wrap:wrap;gap:1.1rem;font-size:.85rem;color:var(--text-2);font-weight:500;margin-bottom:.5rem; }
        .md-surgery-notes { font-size:.875rem;color:var(--text-3);font-style:italic; }

        /* ── Family ── */
        .md-family-grid { display:grid;grid-template-columns:1fr;gap:1.1rem; }
        @media(min-width:640px){ .md-family-grid { grid-template-columns:repeat(2,1fr); } }
        .md-family-card { display:flex;align-items:flex-start;gap:1.1rem;border:1px solid var(--border);border-radius:var(--radius-md);padding:1.5rem;background:#fff;transition:all .2s; }
        .md-family-card:hover { box-shadow:var(--shadow-md);border-color:var(--border-2); }
        .md-family-icon { font-size:2rem;flex-shrink:0; }
        .md-family-rel   { font-size:1.05rem;font-weight:800;color:var(--text-1);margin-bottom:.3rem; }
        .md-family-cond  { font-size:.9rem;font-weight:600;color:var(--text-2);margin-bottom:.3rem; }
        .md-family-age   { font-size:.8rem;color:var(--text-3);font-weight:500; }
        .md-family-notes { font-size:.825rem;color:var(--text-3);font-style:italic;margin-top:.3rem; }

        /* ── Lifestyle ── */
        .md-lifestyle-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:1.1rem;margin-bottom:1.75rem; }
        @media(min-width:768px){ .md-lifestyle-grid { grid-template-columns:repeat(3,1fr); } }
        .md-lifestyle-card { display:flex;align-items:center;gap:1.1rem;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1.25rem;transition:all .2s; }
        .md-lifestyle-card:hover { background:#fff;border-color:var(--border-2);box-shadow:var(--shadow-sm); }
        .md-lifestyle-icon  { font-size:1.75rem;flex-shrink:0; }
        .md-lifestyle-label { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:.3rem; }
        .md-lifestyle-value { font-size:1rem;font-weight:700;color:var(--text-1); }
        .md-lifestyle-empty { color:var(--text-4);font-weight:400;font-style:italic; }
        .md-dietary { padding-top:1.5rem;border-top:1px solid var(--border); }
        .md-dietary-label { font-size:.95rem;font-weight:700;color:var(--text-1);margin-bottom:.875rem; }

        /* ── Empty States ── */
        .md-empty { text-align:center;padding:2rem;color:var(--text-3);font-size:.9rem; }
        .md-empty-lg { text-align:center;padding:3.5rem 1rem;color:var(--text-3); }
        .md-empty-icon    { font-size:2.5rem;display:block;margin-bottom:1rem; }
        .md-empty-icon-lg { font-size:3.5rem;display:block;margin-bottom:1.25rem; }
        .md-empty-lg p    { font-size:1rem;font-weight:600;color:var(--text-2); }
        .md-empty-hint    { font-size:.85rem;color:var(--text-4); }

        /* ── Modals ── */
        .md-modal-overlay {
          position:fixed;inset:0;
          background:rgba(12,35,64,.55);backdrop-filter:blur(5px);
          display:flex;align-items:center;justify-content:center;
          z-index:200;padding:1rem;
          animation:mdIn .2s ease;
        }
        .md-modal {
          background:#fff;border-radius:var(--radius-lg);
          max-width:520px;width:100%;max-height:92vh;overflow-y:auto;
          box-shadow:0 32px 80px rgba(12,35,64,.25);
          animation:mdIn .3s cubic-bezier(.22,1,.36,1);
        }
        .md-modal-lg { max-width:640px; }
        .md-modal-header { display:flex;align-items:center;gap:1.1rem;padding:1.75rem;position:sticky;top:0;z-index:1; }
        .md-modal-header-blue   { background:linear-gradient(135deg,var(--navy),var(--navy-light)); }
        .md-modal-header-red    { background:linear-gradient(135deg,#7f1d1d,#dc2626); }
        .md-modal-header-purple { background:linear-gradient(135deg,#4c1d95,#7c3aed); }
        .md-modal-header-indigo { background:linear-gradient(135deg,#312e81,#4338ca); }
        .md-modal-header-green  { background:linear-gradient(135deg,#14532d,#16a34a); }
        .md-modal-header-teal   { background:linear-gradient(135deg,#134e4a,#0d9488); }
        .md-modal-header-icon { font-size:1.75rem; }
        .md-modal-title { font-size:1.1rem;font-weight:800;color:#fff;margin:0 0 .1rem; }
        .md-modal-sub   { font-size:.8rem;color:rgba(255,255,255,.7); }
        .md-modal-close { margin-left:auto;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;border:none;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:background .2s;flex-shrink:0; }
        .md-modal-close:hover { background:rgba(255,255,255,.25); }
        .md-modal-body { padding:1.75rem;display:flex;flex-direction:column;gap:1.35rem; }
        .md-modal-footer { display:flex;justify-content:flex-end;gap:.875rem;padding:1.35rem 1.75rem;border-top:2px solid var(--surface-3);background:var(--surface-2); }
        .md-modal-field { display:flex;flex-direction:column;gap:.5rem; }
        .md-modal-2col { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
        @media(max-width:480px){ .md-modal-2col { grid-template-columns:1fr; } }
        .md-label { font-size:.775rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--text-2); }
        .md-opt   { font-weight:400;text-transform:none;font-style:italic;letter-spacing:0;color:var(--text-4); }
        .md-hint  { font-size:.775rem;color:var(--text-3); }
        .md-modal-input {
          width:100%;padding:.7rem 1.1rem;
          border:1.5px solid var(--border);border-radius:var(--radius-sm);
          font-size:.925rem;font-family:'Plus Jakarta Sans',sans-serif;color:var(--text-1);
          background:#fff;outline:none;transition:all .2s;box-sizing:border-box;font-weight:500;
        }
        .md-modal-input:focus { border-color:var(--navy-light);box-shadow:0 0 0 3px rgba(42,95,138,.12); }
        .md-modal-disclaimer { font-size:.8rem;color:var(--text-3);text-align:center;font-weight:500; }

        /* Allergy modal specific */
        .md-type-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem; }
        @media(max-width:480px){ .md-type-grid { grid-template-columns:repeat(2,1fr); } }
        .md-type-btn { cursor:pointer;transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif; }
        .md-sev-row { display:flex;gap:.875rem; }
        .md-sev-btn { cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s; }

        /* Prescription detail */
        .md-detail-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem; }
        @media(max-width:480px){ .md-detail-grid { grid-template-columns:1fr; } }
        .md-detail-full { grid-column:span 2; }
        .md-detail-item { background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1.1rem 1.25rem; }
        .md-detail-label { font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:.4rem; }
        .md-detail-value { font-size:.975rem;font-weight:600;color:var(--text-1); }

        /* Modal buttons */
        .md-btn-ghost {
          padding:.65rem 1.35rem;border-radius:12px;
          font-size:.875rem;font-weight:700;color:var(--text-2);
          background:none;border:1.5px solid var(--border);cursor:pointer;
          transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif;
        }
        .md-btn-ghost:hover { background:var(--surface-3);border-color:var(--border-2); }
        .md-btn-primary {
          padding:.65rem 1.5rem;border-radius:12px;
          font-size:.875rem;font-weight:700;color:#fff;
          background:linear-gradient(135deg,var(--navy),var(--navy-light));
          border:none;cursor:pointer;
          box-shadow:0 2px 8px rgba(12,35,64,.2);
          transition:all .2s;font-family:'Plus Jakarta Sans',sans-serif;
        }
        .md-btn-primary:hover { background:linear-gradient(135deg,#081828,var(--navy-mid));transform:translateY(-1px);box-shadow:0 4px 16px rgba(12,35,64,.25); }
        .md-btn-red { background:linear-gradient(135deg,#b91c1c,#dc2626) !important;box-shadow:0 2px 8px rgba(185,28,28,.2) !important; }
        .md-btn-red:hover { background:linear-gradient(135deg,#991b1b,#b91c1c) !important; }

        /* ── Responsive ── */
        @media(max-width:640px){
          .md-hero-banner { padding:1.75rem 1.25rem; }
          .md-card { padding:1.5rem 1.25rem; }
          .md-banner-title { font-size:1.6rem; }
          .md-rx-card-stats { grid-template-columns:repeat(2,1fr); }
          .md-modal { margin:1rem; }
          .md-notif-dropdown { width:320px; right:-60px; }
        }
      `}</style>
    </>
  );
};

export default MedicalDashboard;