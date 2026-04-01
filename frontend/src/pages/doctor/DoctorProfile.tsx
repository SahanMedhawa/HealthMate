import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

interface DoctorProfileData {
  fullName: string;
  email: string;
  specialization: string;
  yearsOfExperience: number;
  contactDetails: {
    email: string;
    phone: string;
  };
  profilePictureUrl?: string;
}

const DoctorProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/doctors/${user?.id}`);
      if (response.data.success) {
        setProfile(response.data.doctor);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      await api.patch(`/doctors/${user.id}/profile`, profile);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    };

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters long";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    setPasswordErrors(errors);
    return !Object.values(errors).some(error => error !== "");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!validatePasswordForm()) {
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/doctors/${user.id}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setShowPasswordModal(true);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.response?.data?.message?.includes("current password")) {
        setPasswordErrors(prev => ({ ...prev, currentPassword: "Current password is incorrect" }));
      } else {
        alert("Failed to change password. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">My Profile</h1>
        <p className="text-lg text-gray-600">Manage your personal information and account settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Profile Picture Section */}
        {profile && (
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4"></h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden">
                  {profile.profilePictureUrl ? (
                    <img 
                      src={profile.profilePictureUrl} 
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent = profile.fullName.charAt(0);
                        }
                      }}
                    />
                  ) : (
                    profile.fullName.charAt(0)
                  )}
                </div>
                {profile.profilePictureUrl && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{profile.fullName}</h3>
                <p className="text-sm text-gray-600">{profile.specialization}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {profile.profilePictureUrl ? "Profile picture uploaded" : "No profile picture set"}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {profile && (
          <form onSubmit={handleProfileUpdate} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Specialization</label>
                <input
                  type="text"
                  value={profile.specialization}
                  onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Years of Experience</label>
                <input
                  type="number"
                  value={profile.yearsOfExperience}
                  onChange={(e) => setProfile({...profile, yearsOfExperience: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Phone</label>
                <input
                  type="tel"
                  value={profile.contactDetails.phone}
                  onChange={(e) => setProfile({
                    ...profile, 
                    contactDetails: {...profile.contactDetails, phone: e.target.value}
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Profile Picture URL</label>
                <input
                  type="url"
                  value={profile.profilePictureUrl || ""}
                  onChange={(e) => setProfile({...profile, profilePictureUrl: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="https://example.com/your-photo.jpg"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        )}

        {/* Password Change Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="text-left">
              <h2 className="text-xl font-semibold text-gray-900">Security</h2>
              <p className="text-sm text-gray-600 mt-1">Manage your account security settings</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
            >
              {showPasswordForm ? "Cancel" : "Change Password"}
            </button>
          </div>
          
          {showPasswordForm && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({...passwordData, currentPassword: e.target.value});
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors(prev => ({ ...prev, currentPassword: "" }));
                      }
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      passwordErrors.currentPassword ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter current password"
                    required
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, newPassword: e.target.value});
                        if (passwordErrors.newPassword) {
                          setPasswordErrors(prev => ({ ...prev, newPassword: "" }));
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        passwordErrors.newPassword ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, confirmPassword: e.target.value});
                        if (passwordErrors.confirmPassword) {
                          setPasswordErrors(prev => ({ ...prev, confirmPassword: "" }));
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        passwordErrors.confirmPassword ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Success Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Password Changed Successfully!</h3>
              <p className="text-gray-600 text-center mb-6">
                Your password has been updated successfully. You can now use your new password to log in.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={handlePasswordModalClose}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;
