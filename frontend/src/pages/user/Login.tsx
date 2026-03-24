import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  loginPatient,
  loginPatientWithGoogle,
  loginDoctor,
  resendVerification,
  type LoginData,
} from "../../services/api";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Validation schema
const validationSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(false);
  const [userType, setUserType] = useState<"patient" | "doctor">("patient");
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | "verification" | null;
    message: string;
    email?: string;
  }>({ type: null, message: "" });

  const initialValues = {
    email: "",
    password: "",
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSignIn(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await loginPatientWithGoogle();
      setSubmitStatus({
        type: "success",
        message: `Welcome, ${response.data?.user?.name}! Google sign-in successful.`,
      });

      // Set user in context and redirect to home
      if (response.data?.user) {
        // Pass the token along with the user data so AuthContext can persist it
        setUser(response.data.user, (response.data as any).token);
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }
    } catch (error: any) {
      setSubmitStatus({
        type: "error",
        message: error.message || "Google sign-in failed. Please try again.",
      });
    } finally {
      setIsGoogleSignIn(false);
    }
  };

  const handleSubmit = async (values: LoginData) => {
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      let response;

      if (userType === "doctor") {
        response = await loginDoctor(values);
        setSubmitStatus({
          type: "success",
          message: `Welcome back, ${response.data?.user?.name}! Login successful.`,
        });

        // Set user in context and redirect to doctor dashboard
        if (response.data?.user) {
          setUser(response.data.user, (response.data as any).token);
          setTimeout(() => {
            navigate("/doctor/dashboard");
          }, 1000);
        }
      } else {
        response = await loginPatient(values);
        setSubmitStatus({
          type: "success",
          message: `Welcome back, ${response.data?.patient?.name}! Login successful.`,
        });

        // Set user in context and redirect to home
        if (response.data?.patient) {
          setUser(response.data.patient, (response.data as any).token);
          setTimeout(() => {
            navigate("/");
          }, 1000);
        }
      }
    } catch (error: any) {
      if (
        error.message?.includes("verify your email") &&
        userType === "patient"
      ) {
        setSubmitStatus({
          type: "verification",
          message: error.message,
          email: values.email,
        });
      } else {
        setSubmitStatus({
          type: "error",
          message:
            error.message || "Login failed. Please check your credentials.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!submitStatus.email) return;

    setIsResendingVerification(true);
    try {
      await resendVerification(submitStatus.email);
      setSubmitStatus({
        type: "success",
        message: "Verification email sent! Please check your inbox.",
      });
    } catch (error: any) {
      setSubmitStatus({
        type: "error",
        message: error.message || "Failed to resend verification email.",
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your HealthMate account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-gray-100">
          {/* User Type Switch */}
          <div className="mb-6">
            <div className="flex items-center justify-center">
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  type="button"
                  onClick={() => setUserType("patient")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${userType === "patient"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("doctor")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${userType === "doctor"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                    }`}
                >
                  Doctor
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {submitStatus.type && (
            <div
              className={`p-4 rounded-lg mb-6 ${submitStatus.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : submitStatus.type === "verification"
                  ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
                  : "bg-red-50 border border-red-200 text-red-800"
                }`}
            >
              <div className="flex items-start">
                <div
                  className={`w-2 h-2 rounded-full mr-2 mt-2 flex-shrink-0 ${submitStatus.type === "success"
                    ? "bg-green-500"
                    : submitStatus.type === "verification"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                    }`}
                ></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{submitStatus.message}</p>
                  {submitStatus.type === "verification" &&
                    userType === "patient" && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isResendingVerification}
                        className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 underline disabled:opacity-50"
                      >
                        {isResendingVerification
                          ? "Sending..."
                          : "Resend verification email"}
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sign-in Button - Only for Patients */}
          {userType === "patient" && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleSignIn}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 mb-6 ${isGoogleSignIn
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  }`}
              >
                {isGoogleSignIn ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </div>
                )}
              </button>

              {/* Divider - Only for Patients */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isValid, dirty }) => (
              <Form className="space-y-6">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email address"
                  />
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="mt-1 text-sm text-red-600"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                  />
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="mt-1 text-sm text-red-600"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isValid || !dirty || isSubmitting}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${!isValid || !dirty || isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                    }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    `Sign In as ${userType === "doctor" ? "Doctor" : "Patient"}`
                  )}
                </button>
              </Form>
            )}
          </Formik>

          {/* Register Link */}
          {userType === "patient" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Create one here
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Your login is secured with industry-standard encryption. Having
            trouble? Contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
