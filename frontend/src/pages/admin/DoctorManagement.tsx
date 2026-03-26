import React, { useEffect, useState } from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  createDoctor,
  getDoctors,
  updateDoctor,
  deleteDoctor,
} from "../../services/api";
import type { DoctorData } from "../../services/api";

const doctorValidationSchema = Yup.object({
  fullName: Yup.string().required("Full name is required"),
  specialization: Yup.string().required("Specialization is required"),
  yearsOfExperience: Yup.number()
    .min(0, "Must be 0 or more")
    .required("Years of experience is required"),
  contactDetails: Yup.object({
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone: Yup.string().required("Phone is required"),
  }),
  profilePictureUrl: Yup.string().url("Invalid URL"),
  availability: Yup.array()
    .of(
      Yup.object({
        day: Yup.string().required("Day is required"),
        date: Yup.string().required("Date is required"),
        startTime: Yup.string().required("Start time is required"),
        endTime: Yup.string().required("End time is required"),
        slots: Yup.number().min(1, "At least 1 slot").required("Slots required"),
      })
    )
    .min(1, "At least one availability required"),
});

const initialDoctor: DoctorData = {
  fullName: "",
  specialization: "",
  yearsOfExperience: 0,
  contactDetails: { email: "", phone: "" },
  profilePictureUrl: "",
  availability: [
    {
      day: "",
      date: "",
      startTime: "",
      endTime: "",
      slots: 1,
    },
  ],
};

const DoctorManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [editingDoctor, setEditingDoctor] = useState<DoctorData | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [loading, setLoading] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await getDoctors();
      setDoctors(res.data?.doctors || []);
    } catch (e: any) {
      setStatus({ type: "error", message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;
    try {
      await deleteDoctor(id);
      setStatus({ type: "success", message: "Doctor deleted successfully" });
      fetchDoctors();
    } catch (e: any) {
      setStatus({ type: "error", message: e.message });
    }
  };

  // Helper to convert date fields to ISO string for backend
  const normalizeDoctor = (values: DoctorData): DoctorData => ({
    ...values,
    availability: values.availability.map((a) => ({
      ...a,
      date: a.date ? new Date(a.date).toISOString() : "",
    })),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">Doctor Management</h1>
          <p className="text-lg text-gray-600">Create and manage doctor profiles and availability</p>
        </div>
        {/* Status Message */}
        {status.type && (
          <div className={`p-4 rounded-lg ${status.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        {/* Doctor Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-gray-100">
          <Formik
            initialValues={editingDoctor || initialDoctor}
            enableReinitialize
            validationSchema={doctorValidationSchema}
            onSubmit={async (values, { resetForm }) => {
              try {
                const normalized = normalizeDoctor(values);
                if (editingDoctor && editingDoctor._id) {
                  await updateDoctor(editingDoctor._id, normalized);
                  setStatus({ type: "success", message: "Doctor updated successfully" });
                } else {
                  await createDoctor(normalized);
                  setStatus({ type: "success", message: "Doctor created successfully" });
                }
                setEditingDoctor(null);
                resetForm();
                fetchDoctors();
              } catch (e: any) {
                setStatus({ type: "error", message: e.message });
              }
            }}
          >
            {({ values, isSubmitting, isValid, dirty }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <Field name="fullName" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <ErrorMessage name="fullName" component="div" className="text-sm text-red-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <Field name="specialization" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <ErrorMessage name="specialization" component="div" className="text-sm text-red-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <Field name="yearsOfExperience" type="number" min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <ErrorMessage name="yearsOfExperience" component="div" className="text-sm text-red-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
                    <Field name="profilePictureUrl" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <ErrorMessage name="profilePictureUrl" component="div" className="text-sm text-red-600" />
                    {values.profilePictureUrl && (
                      <img src={values.profilePictureUrl} alt="Profile" className="mt-2 w-16 h-16 rounded-full object-cover border" />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <Field name="contactDetails.email" type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <ErrorMessage name="contactDetails.email" component="div" className="text-sm text-red-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <Field name="contactDetails.phone" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <ErrorMessage name="contactDetails.phone" component="div" className="text-sm text-red-600" />
                  </div>
                </div>
                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                  <FieldArray name="availability">
                    {({ remove, push }) => (
                      <div className="space-y-4">
                        {values.availability.map((_, idx) => (
                          <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                            <div>
                              <Field name={`availability.${idx}.day`} placeholder="Day" className="w-full px-2 py-1 border border-gray-300 rounded-lg" />
                              <ErrorMessage name={`availability.${idx}.day`} component="div" className="text-xs text-red-600" />
                            </div>
                            <div>
                              <Field name={`availability.${idx}.date`} type="date" className="w-full px-2 py-1 border border-gray-300 rounded-lg" />
                              <ErrorMessage name={`availability.${idx}.date`} component="div" className="text-xs text-red-600" />
                            </div>
                            <div>
                              <Field name={`availability.${idx}.startTime`} type="time" className="w-full px-2 py-1 border border-gray-300 rounded-lg" />
                              <ErrorMessage name={`availability.${idx}.startTime`} component="div" className="text-xs text-red-600" />
                            </div>
                            <div>
                              <Field name={`availability.${idx}.endTime`} type="time" className="w-full px-2 py-1 border border-gray-300 rounded-lg" />
                              <ErrorMessage name={`availability.${idx}.endTime`} component="div" className="text-xs text-red-600" />
                            </div>
                            <div>
                              <Field name={`availability.${idx}.slots`} type="number" min={1} className="w-full px-2 py-1 border border-gray-300 rounded-lg" />
                              <ErrorMessage name={`availability.${idx}.slots`} component="div" className="text-xs text-red-600" />
                            </div>
                            <div>
                              <button type="button" onClick={() => remove(idx)} className="text-red-600 hover:underline text-xs">Remove</button>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => push({ day: "", date: "", startTime: "", endTime: "", slots: 1 })} className="mt-2 text-blue-600 hover:underline text-sm">Add Availability</button>
                      </div>
                    )}
                  </FieldArray>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isValid || !dirty}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
                  >
                    {editingDoctor ? "Update Doctor" : "Create Doctor"}
                  </button>
                  {editingDoctor && (
                    <button
                      type="button"
                      onClick={() => setEditingDoctor(null)}
                      className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </Form>
            )}
          </Formik>
        </div>

        {/* Doctor List */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-gray-100 mt-8">
          <h3 className="text-xl font-bold mb-4">Doctors</h3>
          {loading ? (
            <div className="text-center text-blue-600">Loading...</div>
          ) : doctors.length === 0 ? (
            <p className="text-gray-500">No doctors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr key={doc._id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-2 py-2 flex items-center space-x-2">
                        {doc.profilePictureUrl && (
                          <img src={doc.profilePictureUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover border" />
                        )}
                        <span>{doc.fullName}</span>
                      </td>
                      <td className="px-2 py-2">{doc.specialization}</td>
                      <td className="px-2 py-2">{doc.yearsOfExperience} yrs</td>
                      <td className="px-2 py-2">
                        <div>{doc.contactDetails.email}</div>
                        <div>{doc.contactDetails.phone}</div>
                      </td>
                      <td className="px-2 py-2 space-x-2">
                        <button
                          onClick={() => setEditingDoctor(doc)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorManagement;