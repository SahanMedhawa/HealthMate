import React, { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { getUsers, toggleUserStatus, type User } from "../../services/admin.api";
import api from "../../api/client";

interface DoctorForm {
  email: string;
  password: string;
  fullName: string;
  specialization: string;
  yearsOfExperience: number;
  phone: string;
  profilePictureUrl?: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "patient" | "doctor">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<User | null>(null);
  const [doctorForm, setDoctorForm] = useState<DoctorForm>({
    email: "",
    password: "",
    fullName: "",
    specialization: "",
    yearsOfExperience: 0,
    phone: "",
    profilePictureUrl: "",
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterType, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filterType !== "all") {
        params.userType = filterType;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await getUsers(params);
      if (response.success && response.data) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.totalPages);
        setTotalUsers(response.data.pagination.totalUsers || 0);
      } else {
        setError("Failed to fetch users");
      }
    } catch (error: any) {
      setError(error.message || "Error fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setIsToggling(userId);
      const newStatus = !currentStatus;
      const response = await toggleUserStatus(userId, newStatus);

      if (response.success) {
        // Update the user in the local state
        setUsers(users.map(user =>
          user._id === userId
            ? { ...user, isVerified: newStatus }
            : user
        ));
      } else {
        setError(response.message || "Failed to update user status");
      }
    } catch (error: any) {
      setError(error.message || "Error updating user status");
    } finally {
      setIsToggling(null);
    }
  };

  const handleEditDoctor = (doctor: User) => {
    setEditingDoctor(doctor);
    setDoctorForm({
      email: doctor.email || "",
      password: "", // Don't show existing password
      fullName: doctor.fullName || doctor.name || "",
      specialization: doctor.specialization || "",
      yearsOfExperience: doctor.yearsOfExperience || 0,
      phone: doctor.contactDetails?.phone || "",
      profilePictureUrl: (doctor as any).profilePictureUrl || "",
    });
    setShowAddDoctor(true);
  };

  const resetDoctorForm = () => {
    setDoctorForm({
      email: "",
      password: "",
      fullName: "",
      specialization: "",
      yearsOfExperience: 0,
      phone: "",
      profilePictureUrl: "",
    });
    setEditingDoctor(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value as "all" | "patient" | "doctor");
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatName = (u: User) => {
    const raw = (u.fullName || u.name || "");
    return raw.replace(/\s+/g, " ").trim();
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">User Management</h1>
          <p className="mt-2 text-lg text-gray-600">Manage doctors and patients in the system</p>
        </div>
        <button
          onClick={() => setShowAddDoctor(true)}
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-sm hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-[0.99] transition-all duration-200"
          aria-label="Add Doctor"
        >
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-white/10">
            <UserPlusIcon className="h-4 w-4" />
          </span>
          Add Doctor
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start">
            <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors duration-200"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-xl">
              <FunnelIcon className="h-5 w-5 text-gray-600" />
            </div>
            <select
              value={filterType}
              onChange={handleFilterChange}
              className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors duration-200"
            >
              <option value="all">All Users</option>
              <option value="patient">Patients</option>
              <option value="doctor">Doctors</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-6 text-sm font-semibold text-gray-600 bg-gray-50 px-4 py-2 rounded-xl">
          Showing {users.length} of {totalUsers} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="w-1/3 px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Specialization
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="w-1/3 px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img
                          src={
                            user.photoURL ||
                            user.profilePictureUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(formatName(user))}&background=6b7280&color=fff`
                          }
                          alt={formatName(user)}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.textContent = formatName(user).charAt(0).toUpperCase();
                              parent.classList.add("text-sm", "font-medium", "text-gray-700");
                            }
                          }}
                        />
                      </div>
                      <div className="ml-4 min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {formatName(user)}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{(user.email || "").trim()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${user.userType === "doctor"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                        }`}
                    >
                      {user.userType}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${user.isVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {user.isVerified ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500">
                    {user.specialization || "-"}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <button className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-colors duration-200">
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => user.userType === "doctor" && handleEditDoctor(user)}
                        disabled={user.userType !== "doctor"}
                        className={`p-2 rounded-xl transition-colors duration-200 ${user.userType === "doctor" ? "text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50" : "text-gray-300 cursor-not-allowed"}`}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user._id, user.isVerified)}
                        disabled={isToggling === user._id}
                        className={`p-2 rounded-xl transition-colors duration-200 ${user.isVerified
                          ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                          : "text-green-600 hover:text-green-900 hover:bg-green-50"
                          } ${isToggling === user._id ? "opacity-50" : ""}`}
                      >
                        {isToggling === user._id ? (
                          <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                        ) : user.isVerified ? (
                          <TrashIcon className="h-5 w-5" />
                        ) : (
                          <UserPlusIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalUsers)}
                  </span>{" "}
                  of <span className="font-medium">{totalUsers}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pageNum === currentPage
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <UserPlusIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-xl font-bold text-white leading-tight">{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</h3>
                  <p className="text-blue-100 text-sm leading-tight">{editingDoctor ? "Update doctor profile information" : "Create a doctor profile for the system"}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddDoctor(false);
                    resetDoctorForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors duration-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8 space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 text-left">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={doctorForm.fullName}
                  onChange={(e) => setDoctorForm({ ...doctorForm, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Dr. Jane Smith"
                />
              </div>

              {/* Email and Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 text-left">
                    Email (Username) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                    placeholder="doctor@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 text-left">
                    {editingDoctor ? "New Password (Empty = Current PW)" : "Temporary Password"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Generate or type a temp password"
                  />
                </div>
              </div>

              {/* Specialization and Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 text-left">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={doctorForm.specialization}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Cardiology"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 text-left">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={doctorForm.yearsOfExperience}
                    onChange={(e) => setDoctorForm({ ...doctorForm, yearsOfExperience: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                    placeholder="10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 text-left">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                  placeholder="+94 xxxxxxxxx"
                />
              </div>

              {/* Profile Picture URL */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 text-left">
                  Profile Picture URL
                </label>
                <input
                  value={doctorForm.profilePictureUrl}
                  onChange={(e) => setDoctorForm({ ...doctorForm, profilePictureUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-gray-50 focus:bg-white"
                  placeholder="https://example.com/doctor-photo.jpg"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-red-700">{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-8 py-6 flex items-center justify-end space-x-4">
              <button
                onClick={() => {
                  setShowAddDoctor(false);
                  resetDoctorForm();
                }}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                disabled={creatingDoctor}
                className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                onClick={async () => {
                  try {
                    setCreatingDoctor(true);
                    setError("");
                    // Basic validation for required fields
                    const requiredMissing = [
                      doctorForm.fullName.trim() === "",
                      doctorForm.email.trim() === "",
                      doctorForm.specialization.trim() === "",
                      !editingDoctor && doctorForm.password.trim() === "",
                    ].some(Boolean);
                    if (requiredMissing) {
                      setError(editingDoctor ? "Please fill all required fields (Full Name, Email, Specialization)." : "Please fill all required fields (Full Name, Email, Specialization, Password).");
                      setCreatingDoctor(false);
                      return;
                    }

                    if (editingDoctor) {
                      // Update existing doctor
                      const payload = {
                        name: doctorForm.fullName,
                        email: doctorForm.email,
                        password: doctorForm.password || undefined, // Only include if provided
                        fullName: doctorForm.fullName,
                        specialization: doctorForm.specialization,
                        yearsOfExperience: doctorForm.yearsOfExperience,
                        contactDetails: { email: doctorForm.email, phone: doctorForm.phone },
                        profilePictureUrl: doctorForm.profilePictureUrl,
                      };
                      const response = await api.put(`/admin/doctors/${editingDoctor._id}`, payload);
                      const data = response.data;
                      if (!data.success) throw new Error(data.message || "Failed to update doctor");
                    } else {
                      // Create new doctor
                      const payload = {
                        name: doctorForm.fullName,
                        email: doctorForm.email,
                        password: doctorForm.password,
                        fullName: doctorForm.fullName,
                        specialization: doctorForm.specialization,
                        yearsOfExperience: doctorForm.yearsOfExperience,
                        contactDetails: { email: doctorForm.email, phone: doctorForm.phone },
                        profilePictureUrl: doctorForm.profilePictureUrl,
                        userType: "doctor" as const,
                      };
                      const response = await api.post(`/admin/doctors`, payload);
                      const data = response.data;
                      if (!data.success) throw new Error(data.message || "Failed to create doctor");
                    }

                    // refresh list and close modal
                    setShowAddDoctor(false);
                    resetDoctorForm();
                    setCurrentPage(1);
                    fetchUsers();
                  } catch (e: any) {
                    const errorMessage = e.response?.data?.message || e.message || `Failed to ${editingDoctor ? "update" : "create"} doctor`;
                    setError(errorMessage);
                  } finally {
                    setCreatingDoctor(false);
                  }
                }}
              >
                {creatingDoctor ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>{editingDoctor ? "Updating..." : "Creating..."}</span>
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4" />
                    <span>{editingDoctor ? "Update Doctor" : "Create Doctor"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
