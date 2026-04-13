import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import patientAPI, { type PatientProfile as PatientProfileType } from '../../services/patient.api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/user/Navbar';

const PatientProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<PatientProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PatientProfileType>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getCurrentUser();
      if (response.success && response.user) {
        setProfile(response.user);
        const userData = response.user;
        const patientProfileData = response.user.patientProfile || {};
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phoneNumber: patientProfileData.phoneNumber || userData.phoneNumber || '',
          dateOfBirth: patientProfileData.dateOfBirth || userData.dateOfBirth || '',
          gender: patientProfileData.gender || userData.gender || '',
          bloodGroup: patientProfileData.bloodGroup || userData.bloodGroup || '',
          address: patientProfileData.address || userData.address || { street: '', city: '', state: '', zipCode: '', country: '' },
          emergencyContact: patientProfileData.emergencyContact || userData.emergencyContact || { name: '', relationship: '', phone: '' },
          medicalHistory: patientProfileData.medicalHistory || userData.medicalHistory || [],
          allergies: patientProfileData.allergies || userData.allergies || [],
          chronicConditions: patientProfileData.chronicConditions || userData.chronicConditions || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev[parent as keyof PatientProfileType] as any), [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        medicalHistory: formData.medicalHistory,
        allergies: formData.allergies,
        chronicConditions: formData.chronicConditions
      };
      await patientAPI.updateProfile(updateData);
      await fetchProfile();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await patientAPI.deleteAccount();
      alert('Your account has been deactivated successfully.');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const hasAdditionalDetails = () => {
    return (
      formData.phoneNumber || formData.dateOfBirth || formData.gender || formData.bloodGroup ||
      (formData.address && (formData.address as any)?.street) ||
      (formData.emergencyContact && (formData.emergencyContact as any)?.name)
    );
  };

  const getInitials = () => {
    const name = formData.name || authUser?.name || 'U';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'contact', label: 'Contact & Emergency', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pf-loading-screen">
          <div className="pf-loading-inner">
            <div className="pf-spinner">
              <div className="pf-spinner-ring"></div>
              <div className="pf-pulse-dot"></div>
            </div>
            <p className="pf-loading-text">Loading patient profile</p>
            <span className="pf-loading-sub">Please wait a moment…</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="pf-root">
        {/* Medical-themed background */}
        <div className="pf-bg-decoration" aria-hidden="true">
          <div className="pf-bg-circle pf-bg-circle-1"></div>
          <div className="pf-bg-circle pf-bg-circle-2"></div>
          <div className="pf-bg-crosses">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`pf-cross pf-cross-${i+1}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6v12M6 12h12" strokeLinecap="round"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

        <div className="pf-container">

          {/* ── Hero Header Card ── */}
          <div className="pf-hero-card pf-animate-in">
            <div className="pf-hero-banner">
              <div className="pf-banner-pattern" aria-hidden="true"></div>

              <div className="pf-hero-content">
                <div className="pf-hero-left">
                  {/* Avatar */}
                  <div className="pf-avatar-wrap">
                    <div className="pf-avatar-ring"></div>
                    <div className="pf-avatar">
                      {authUser?.photoURL ? (
                        <img src={authUser.photoURL} alt={authUser.name} className="pf-avatar-img" />
                      ) : (
                        <span className="pf-avatar-initials">{getInitials()}</span>
                      )}
                    </div>
                    <div className="pf-avatar-badge" title="Active account">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Identity */}
                  <div className="pf-hero-identity">
                    <div className="pf-patient-label">Patient ID: NEW</div>
                    <h1 className="pf-patient-name">{formData.name || 'Patient'}</h1>
                    <div className="pf-patient-meta">
                      <span className="pf-meta-chip pf-meta-email">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {formData.email}
                      </span>
                      <span className="pf-meta-chip pf-meta-verified">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                      {formData.bloodGroup && (
                        <span className="pf-meta-chip pf-meta-blood">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.56.45-3.01 1.21-4.24L16.24 18.8C15.01 19.55 13.56 20 12 20zm6.79-3.76L7.76 5.21C8.99 4.45 10.44 4 12 4c4.41 0 8 3.59 8 8 0 1.56-.45 3.01-1.21 4.24z"/>
                          </svg>
                          {formData.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pf-hero-actions">
                  {!isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(true)} className="pf-btn pf-btn-edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Profile
                      </button>
                      {hasAdditionalDetails() && (
                        <button onClick={() => setShowDeleteConfirm(true)} className="pf-btn pf-btn-delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Account
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => { setIsEditing(false); fetchProfile(); }} className="pf-btn pf-btn-cancel">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Nav */}
            <div className="pf-tab-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pf-tab ${activeTab === tab.id ? 'pf-tab-active' : ''}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {activeTab === tab.id && <span className="pf-tab-indicator"></span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main Form Card ── */}
          <form onSubmit={handleSubmit}>
            <div className="pf-content-card pf-animate-in pf-animate-delay-1">

              {/* Personal Tab */}
              {activeTab === 'personal' && (
                <div className="pf-tab-panel">
                  <div className="pf-section-header">
                    <div className="pf-section-icon pf-icon-blue">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="pf-section-title">Personal Information</h2>
                      <p className="pf-section-desc">Basic demographic and contact details</p>
                    </div>
                  </div>

                  <div className="pf-field-grid">
                    {/* Full Name */}
                    <div className="pf-field-card pf-field-locked">
                      <div className="pf-field-label">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Full Name
                        <span className="pf-field-badge">SSO Sync</span>
                      </div>
                      {isEditing ? (
                        <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="pf-input" />
                      ) : (
                        <p className="pf-field-value">{formData.name || <span className="pf-empty">Not provided</span>}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="pf-field-card pf-field-locked">
                      <div className="pf-field-label">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email Address
                        <span className="pf-field-badge pf-badge-verified">Primary</span>
                      </div>
                      <p className="pf-field-value">{formData.email}</p>
                    </div>

                    {/* Phone */}
                    <div className="pf-field-card">
                      <div className="pf-field-label">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Phone Number
                      </div>
                      {isEditing ? (
                        <input type="tel" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleInputChange} placeholder="e.g. +1 234 567 8900" className="pf-input" />
                      ) : (
                        <p className="pf-field-value">{formData.phoneNumber || <span className="pf-empty">Not provided</span>}</p>
                      )}
                    </div>

                    {/* DOB */}
                    <div className="pf-field-card">
                      <div className="pf-field-label">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Date of Birth
                      </div>
                      {isEditing ? (
                        <input type="date" name="dateOfBirth" value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="pf-input" />
                      ) : (
                        <p className="pf-field-value">
                          {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : <span className="pf-empty">Not provided</span>}
                        </p>
                      )}
                    </div>

                    {/* Gender */}
                    <div className="pf-field-card">
                      <div className="pf-field-label">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Gender
                      </div>
                      {isEditing ? (
                        <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="pf-input pf-select">
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other / Prefer not to say</option>
                        </select>
                      ) : (
                        <p className="pf-field-value" style={{ textTransform: 'capitalize' }}>{formData.gender || <span className="pf-empty">Not provided</span>}</p>
                      )}
                    </div>

                    {/* Blood Group */}
                    <div className="pf-field-card pf-field-accent-red">
                      <div className="pf-field-label">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Blood Group
                        <span className="pf-field-badge pf-badge-critical">Medical</span>
                      </div>
                      {isEditing ? (
                        <select name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleInputChange} className="pf-input pf-select">
                          <option value="">Select blood group</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      ) : (
                        <p className="pf-field-value pf-blood-value">{formData.bloodGroup || <span className="pf-empty">Not provided</span>}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === 'contact' && (
                <div className="pf-tab-panel">
                  <div className="pf-section-header">
                    <div className="pf-section-icon pf-icon-teal">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="pf-section-title">Contact & Address</h2>
                      <p className="pf-section-desc">Location details and emergency contact information</p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="pf-contact-block">
                    <h3 className="pf-contact-block-title">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Home Address
                    </h3>
                    <div className="pf-field-grid">
                      <div className="pf-field-card pf-span-2">
                        <div className="pf-field-label">Street Address</div>
                        {isEditing ? (
                          <input type="text" name="address.street" value={(formData.address as any)?.street || ''} onChange={handleInputChange} placeholder="123 Main Street" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.address as any)?.street || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                      <div className="pf-field-card">
                        <div className="pf-field-label">City</div>
                        {isEditing ? (
                          <input type="text" name="address.city" value={(formData.address as any)?.city || ''} onChange={handleInputChange} placeholder="City" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.address as any)?.city || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                      <div className="pf-field-card">
                        <div className="pf-field-label">State / Province</div>
                        {isEditing ? (
                          <input type="text" name="address.state" value={(formData.address as any)?.state || ''} onChange={handleInputChange} placeholder="State" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.address as any)?.state || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                      <div className="pf-field-card">
                        <div className="pf-field-label">ZIP / Postal Code</div>
                        {isEditing ? (
                          <input type="text" name="address.zipCode" value={(formData.address as any)?.zipCode || ''} onChange={handleInputChange} placeholder="00000" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.address as any)?.zipCode || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                      <div className="pf-field-card">
                        <div className="pf-field-label">Country</div>
                        {isEditing ? (
                          <input type="text" name="address.country" value={(formData.address as any)?.country || ''} onChange={handleInputChange} placeholder="Country" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.address as any)?.country || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="pf-contact-block pf-emergency-block">
                    <h3 className="pf-contact-block-title pf-emergency-title">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      Emergency Contact
                      <span className="pf-emergency-badge">SOS</span>
                    </h3>
                    <div className="pf-field-grid">
                      <div className="pf-field-card">
                        <div className="pf-field-label">Contact Name</div>
                        {isEditing ? (
                          <input type="text" name="emergencyContact.name" value={(formData.emergencyContact as any)?.name || ''} onChange={handleInputChange} placeholder="Full name" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.emergencyContact as any)?.name || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                      <div className="pf-field-card">
                        <div className="pf-field-label">Relationship</div>
                        {isEditing ? (
                          <input type="text" name="emergencyContact.relationship" value={(formData.emergencyContact as any)?.relationship || ''} onChange={handleInputChange} placeholder="e.g. Spouse, Parent" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.emergencyContact as any)?.relationship || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                      <div className="pf-field-card pf-span-2">
                        <div className="pf-field-label">Phone Number</div>
                        {isEditing ? (
                          <input type="tel" name="emergencyContact.phone" value={(formData.emergencyContact as any)?.phone || ''} onChange={handleInputChange} placeholder="Emergency phone number" className="pf-input" />
                        ) : (
                          <p className="pf-field-value">{(formData.emergencyContact as any)?.phone || <span className="pf-empty">Not provided</span>}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Footer */}
              {isEditing && (
                <div className="pf-form-footer">
                  <p className="pf-form-footer-note">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Changes will be saved to your patient record immediately.
                  </p>
                  <div className="pf-footer-actions">
                    <button type="button" onClick={() => { setIsEditing(false); fetchProfile(); }} className="pf-btn-ghost">
                      Discard Changes
                    </button>
                    <button type="submit" disabled={saving} className="pf-btn-save">
                      {saving ? (
                        <>
                          <svg className="pf-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Healthcare System Info Banner */}
          <div className="pf-info-banner pf-animate-in pf-animate-delay-2">
            <div className="pf-info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="pf-info-title">Secure Healthcare Platform</p>
              <p className="pf-info-text">Your medical records are protected with end-to-end encryption and comply with healthcare privacy regulations.</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Delete Modal ── */}
      {showDeleteConfirm && (
        <div className="pf-modal-overlay">
          <div className="pf-modal">
            <div className="pf-modal-danger-icon">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="pf-modal-title">Delete Account</h3>
            <p className="pf-modal-body">
              This will permanently remove your account and all associated medical records. This action cannot be undone.
            </p>
            <div className="pf-modal-confirm-box">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Your appointment history, prescriptions, and medical records will be permanently erased.</span>
            </div>
            <div className="pf-modal-actions">
              <button onClick={() => setShowDeleteConfirm(false)} className="pf-btn-ghost">
                Keep Account
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="pf-btn-danger">
                {deleting ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap');

        /* ── CSS Variables - Hospital Management Theme ── */
        :root {
          --primary:       #0a6e5e;
          --primary-dark:  #085c4e;
          --primary-light: #e6f4f1;
          --secondary:     #1e40af;
          --secondary-dark: #1e3a8a;
          --accent:        #0d9488;
          --accent-red:    #dc2626;
          --accent-yellow: #d97706;
          --gray-50:       #f8fafc;
          --gray-100:      #f1f5f9;
          --gray-200:      #e2e8f0;
          --gray-300:      #cbd5e1;
          --gray-400:      #94a3b8;
          --gray-500:      #64748b;
          --gray-600:      #475569;
          --gray-700:      #334155;
          --gray-800:      #1e293b;
          --gray-900:      #0f172a;
          --success:       #059669;
          --warning:       #d97706;
          --error:         #dc2626;
          --info:          #3b82f6;
          --shadow-sm:     0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md:     0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg:     0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          --shadow-xl:     0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          --radius-sm:     0.5rem;
          --radius-md:     0.75rem;
          --radius-lg:     1rem;
          --radius-xl:     1.5rem;
        }

        /* ── Root ── */
        .pf-root {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
          padding: 2rem 1.25rem 4rem;
          margin-top: 64px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* ── Medical Background Decor ── */
        .pf-bg-decoration { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .pf-bg-circle { position: absolute; border-radius: 50%; opacity: 0.4; }
        .pf-bg-circle-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, var(--primary-light), transparent 70%);
          top: -200px; right: -150px;
        }
        .pf-bg-circle-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #e0e7ff, transparent 70%);
          bottom: -150px; left: -100px;
        }
        .pf-bg-crosses { position: absolute; inset: 0; opacity: 0.03; }
        .pf-cross { position: absolute; width: 32px; height: 32px; color: var(--primary); }
        .pf-cross-1 { top: 10%; left: 5%; transform: rotate(15deg); }
        .pf-cross-2 { top: 20%; right: 8%; transform: rotate(-10deg); }
        .pf-cross-3 { bottom: 15%; left: 12%; transform: rotate(25deg); }
        .pf-cross-4 { bottom: 25%; right: 15%; transform: rotate(-20deg); }
        .pf-cross-5 { top: 40%; left: 2%; transform: rotate(5deg); }
        .pf-cross-6 { top: 60%; right: 3%; transform: rotate(-15deg); }
        .pf-cross-7 { bottom: 40%; left: 20%; transform: rotate(10deg); }
        .pf-cross-8 { top: 75%; right: 20%; transform: rotate(-5deg); }
        .pf-cross svg { width: 100%; height: 100%; stroke: currentColor; }

        /* ── Container ── */
        .pf-container {
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Animations ── */
        @keyframes pfSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pfFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pf-animate-in       { animation: pfSlideIn 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1) both; }
        .pf-animate-delay-1  { animation-delay: 0.1s; }
        .pf-animate-delay-2  { animation-delay: 0.2s; }

        @keyframes pfSpin  { to { transform: rotate(360deg); } }
        @keyframes pfPulse { 0%,100%{transform:scale(.8);opacity:.7;} 50%{transform:scale(1.2);opacity:1;} }
        .pf-spin { animation: pfSpin 0.7s linear infinite; }

        /* ── Loading ── */
        .pf-loading-screen {
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh; background: var(--gray-50);
          margin-top: 64px; font-family: 'Inter', sans-serif;
        }
        .pf-loading-inner { text-align: center; }
        .pf-spinner { position: relative; width: 60px; height: 60px; margin: 0 auto 1.5rem; }
        .pf-spinner-ring {
          width: 60px; height: 60px;
          border: 3px solid var(--gray-200);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: pfSpin 0.8s linear infinite;
        }
        .pf-pulse-dot {
          position: absolute; inset: 0; margin: auto;
          width: 12px; height: 12px;
          background: var(--primary);
          border-radius: 50%;
          animation: pfPulse 1.6s ease-in-out infinite;
        }
        .pf-loading-text { font-size: 1rem; font-weight: 600; color: var(--gray-700); margin-bottom: .3rem; }
        .pf-loading-sub  { font-size: .85rem; color: var(--gray-500); }

        /* ── Hero Card ── */
        .pf-hero-card {
          background: white;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }

        /* ── Hero Banner ── */
        .pf-hero-banner {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          padding: 2rem 2.5rem;
          position: relative;
          overflow: hidden;
        }
        .pf-banner-pattern {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.3;
        }

        .pf-hero-content {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .pf-hero-left { display: flex; align-items: center; gap: 1.75rem; }

        /* ── Avatar ── */
        .pf-avatar-wrap { position: relative; flex-shrink: 0; }
        .pf-avatar-ring {
          position: absolute; inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,.4);
          animation: pfPulse 2s ease-in-out infinite;
        }
        .pf-avatar {
          width: 88px; height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,.2), rgba(255,255,255,.08));
          backdrop-filter: blur(8px);
          border: 3px solid rgba(255,255,255,.5);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .pf-avatar-img      { width: 100%; height: 100%; object-fit: cover; }
        .pf-avatar-initials {
          font-size: 2rem; font-weight: 700;
          color: #fff; letter-spacing: -.5px;
        }
        .pf-avatar-badge {
          position: absolute; bottom: 2px; right: 2px;
          width: 24px; height: 24px;
          background: var(--success);
          border-radius: 50%;
          border: 3px solid var(--primary-dark);
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-sm);
        }

        /* ── Identity ── */
        .pf-patient-label {
          font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.05em; text-transform: uppercase;
          color: rgba(255,255,255,.6); margin-bottom: 0.25rem;
          font-family: 'Inter', monospace;
        }
        .pf-patient-name {
          font-size: 1.75rem; font-weight: 700;
          color: #fff; margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .pf-patient-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pf-meta-chip {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.7rem; font-weight: 500;
          backdrop-filter: blur(4px);
        }
        .pf-meta-email {
          background: rgba(255,255,255,.12);
          color: rgba(255,255,255,.9);
          border: 1px solid rgba(255,255,255,.2);
        }
        .pf-meta-verified {
          background: rgba(5,150,105,.3);
          color: #a7f3d0;
          border: 1px solid rgba(5,150,105,.5);
        }
        .pf-meta-blood {
          background: rgba(220,38,38,.25);
          color: #fecaca;
          border: 1px solid rgba(220,38,38,.4);
          font-weight: 600;
        }

        /* ── Hero Actions ── */
        .pf-hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .pf-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease;
          border: none;
          font-family: 'Inter', sans-serif;
        }
        .pf-btn-edit {
          background: white; color: var(--primary-dark);
          box-shadow: var(--shadow-sm);
        }
        .pf-btn-edit:hover {
          background: var(--gray-50);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .pf-btn-delete {
          background: rgba(220,38,38,.15);
          color: #fecaca;
          border: 1px solid rgba(220,38,38,.3);
        }
        .pf-btn-delete:hover { background: rgba(220,38,38,.25); }
        .pf-btn-cancel {
          background: rgba(255,255,255,.12);
          color: rgba(255,255,255,.9);
          border: 1px solid rgba(255,255,255,.25);
          backdrop-filter: blur(4px);
        }
        .pf-btn-cancel:hover { background: rgba(255,255,255,.2); }

        /* ── Tab Nav ── */
        .pf-tab-nav {
          display: flex;
          border-top: 1px solid var(--gray-200);
          padding: 0 1.5rem;
          background: white;
          gap: 0.25rem;
        }
        .pf-tab {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 1rem 1.5rem;
          font-size: 0.875rem; font-weight: 600;
          color: var(--gray-500);
          background: none; border: none; cursor: pointer;
          position: relative; transition: all 0.2s;
          font-family: 'Inter', sans-serif;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }
        .pf-tab:hover { color: var(--primary); background: var(--gray-50); }
        .pf-tab-active { color: var(--primary) !important; background: var(--primary-light); }
        .pf-tab-indicator {
          position: absolute; bottom: 0; left: 0.75rem; right: 0.75rem;
          height: 2px; background: var(--primary);
          border-radius: 2px;
        }

        /* ── Content Card ── */
        .pf-content-card {
          background: white;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }
        .pf-tab-panel { padding: 2rem 2rem; }

        /* ── Section Header ── */
        .pf-section-header {
          display: flex; align-items: center; gap: 1rem;
          margin-bottom: 1.75rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--gray-100);
        }
        .pf-section-icon {
          width: 48px; height: 48px;
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .pf-icon-blue { background: #e0f2fe; color: #0284c7; }
        .pf-icon-teal { background: #ccfbf1; color: #0d9488; }
        .pf-icon-purple { background: #f3e8ff; color: #9333ea; }
        .pf-section-title {
          font-size: 1.125rem; font-weight: 700;
          color: var(--gray-800); margin: 0 0 0.15rem;
        }
        .pf-section-desc { font-size: 0.8rem; color: var(--gray-500); margin: 0; }

        /* ── Field Grid & Cards ── */
        .pf-field-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .pf-field-grid { grid-template-columns: 1fr; }
          .pf-span-2 { grid-column: span 1; }
        }
        .pf-span-2 { grid-column: span 2; }

        .pf-field-card {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
          transition: all 0.2s ease;
        }
        .pf-field-card:has(.pf-input:focus) {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(10,110,94,.1);
          background: white;
        }
        .pf-field-card:hover:not(:has(.pf-input:focus)) {
          border-color: var(--gray-300);
          background: white;
        }
        .pf-field-locked { background: var(--gray-50); }
        .pf-field-accent-red {
          border-color: #fecaca;
          background: #fef2f2;
        }

        /* ── Field Labels ── */
        .pf-field-label {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.03em; text-transform: uppercase;
          color: var(--gray-500);
          margin-bottom: 0.5rem;
        }
        .pf-field-badge {
          margin-left: auto;
          font-size: 0.6rem; font-weight: 600;
          padding: 0.1rem 0.5rem;
          border-radius: 999px;
          background: #e0e7ff; color: #3730a3;
          text-transform: uppercase;
        }
        .pf-badge-verified { background: #d1fae5; color: var(--success); }

        /* ── Field Values ── */
        .pf-field-value {
          font-size: 0.95rem; font-weight: 500;
          color: var(--gray-700); margin: 0;
        }
        .pf-blood-value {
          font-size: 1.25rem; font-weight: 700;
          color: var(--error);
          letter-spacing: 0.02em;
        }
        .pf-empty { color: var(--gray-400); font-style: italic; font-weight: 400; }

        /* ── Inputs ── */
        .pf-input {
          width: 100%; padding: 0.6rem 0.85rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          font-size: 0.875rem; font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: var(--gray-800);
          background: white;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        .pf-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(10,110,94,.1);
        }
        .pf-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.25rem; }

        /* ── Contact Blocks ── */
        .pf-contact-block { margin-bottom: 1.75rem; }
        .pf-contact-block:last-child { margin-bottom: 0; }
        .pf-contact-block-title {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.9rem; font-weight: 700;
          color: var(--gray-700);
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--gray-200);
        }
        .pf-emergency-title { color: var(--error); }
        .pf-emergency-badge {
          margin-left: auto;
          font-size: 0.6rem; font-weight: 700;
          padding: 0.1rem 0.6rem;
          border-radius: 999px;
          background: var(--error); color: white;
          letter-spacing: 0.05em;
        }
        .pf-emergency-block .pf-field-card {
          border-color: #fecaca;
          background: #fef2f2;
        }

        /* ── Form Footer ── */
        .pf-form-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 2rem;
          background: var(--gray-50);
          border-top: 1px solid var(--gray-200);
          gap: 1rem; flex-wrap: wrap;
        }
        .pf-form-footer-note {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.75rem; color: var(--gray-500); font-weight: 500;
          margin: 0;
        }
        .pf-footer-actions { display: flex; gap: 0.75rem; }
        .pf-btn-ghost {
          padding: 0.5rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem; font-weight: 600;
          color: var(--gray-600);
          background: white;
          border: 1px solid var(--gray-300);
          cursor: pointer; transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .pf-btn-ghost:hover { background: var(--gray-100); border-color: var(--gray-400); }
        .pf-btn-save {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 1.5rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem; font-weight: 600;
          color: white;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none; cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
          font-family: 'Inter', sans-serif;
        }
        .pf-btn-save:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--primary-dark), #043b32);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .pf-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Info Banner ── */
        .pf-info-banner {
          display: flex; align-items: flex-start; gap: 1rem;
          padding: 1rem 1.25rem;
          background: white;
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
        }
        .pf-info-icon {
          width: 40px; height: 40px;
          border-radius: var(--radius-md);
          background: var(--primary-light);
          border: 1px solid var(--gray-200);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: var(--primary);
        }
        .pf-info-title { font-size: 0.85rem; font-weight: 700; color: var(--gray-700); margin: 0 0 0.2rem; }
        .pf-info-text  { font-size: 0.75rem; color: var(--gray-500); margin: 0; }

        /* ── Modal ── */
        .pf-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 200;
          animation: pfFadeIn 0.2s ease;
        }
        .pf-modal {
          background: white;
          border-radius: var(--radius-xl);
          padding: 2rem;
          max-width: 440px; width: 90%;
          box-shadow: var(--shadow-xl);
          animation: pfSlideIn 0.3s ease;
        }
        .pf-modal-danger-icon {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: #fef2f2;
          border: 3px solid #fee2e2;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem;
        }
        .pf-modal-title {
          font-size: 1.125rem; font-weight: 700;
          text-align: center; color: var(--gray-800);
          margin: 0 0 0.75rem;
        }
        .pf-modal-body {
          font-size: 0.875rem; color: var(--gray-600);
          text-align: center; line-height: 1.5;
          margin: 0 0 1rem;
        }
        .pf-modal-confirm-box {
          display: flex; gap: 0.75rem; align-items: flex-start;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          font-size: 0.75rem; color: #991b1b;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        .pf-modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
        .pf-btn-danger {
          padding: 0.6rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem; font-weight: 600;
          color: white; background: var(--error);
          border: none; cursor: pointer; transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .pf-btn-danger:hover:not(:disabled) { background: #b91c1c; }
        .pf-btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .pf-hero-banner  { padding: 1.5rem; }
          .pf-hero-content { flex-direction: column; align-items: flex-start; }
          .pf-hero-actions { width: 100%; }
          .pf-tab-panel    { padding: 1.25rem; }
          .pf-form-footer  { flex-direction: column; align-items: stretch; }
          .pf-footer-actions { justify-content: flex-end; }
          .pf-patient-name { font-size: 1.35rem; }
          .pf-tab          { padding: 0.75rem 1rem; font-size: 0.8rem; }
          .pf-avatar       { width: 70px; height: 70px; }
          .pf-avatar-initials { font-size: 1.5rem; }
        }
      `}</style>
    </>
  );
};

export default PatientProfile;