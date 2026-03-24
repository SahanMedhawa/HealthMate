import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyPatient } from "../../services/api";

const Verify: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [verificationStatus, setVerificationStatus] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
    patientName?: string;
  }>({
    loading: true,
    success: false,
    message: "",
  });

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setVerificationStatus({
          loading: false,
          success: false,
          message:
            "Invalid verification link. Please check your email and try again.",
        });
        return;
      }

      try {
        const response = await verifyPatient(token);
        setVerificationStatus({
          loading: false,
          success: true,
          message:
            response.message || "Your account has been verified successfully!",
          patientName: response.data?.patient?.name,
        });
      } catch (error: any) {
        setVerificationStatus({
          loading: false,
          success: false,
          message:
            error.message ||
            "Verification failed. The link may be invalid or expired.",
        });
      }
    };

    handleVerification();
  }, [token]);

  if (verificationStatus.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="bg-white py-12 px-6 shadow-xl rounded-lg border border-gray-100">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Account
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="bg-white py-12 px-6 shadow-xl rounded-lg border border-gray-100">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-teal-500 rounded-full"></div>
            </div>
          </div>

          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {verificationStatus.success ? (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="mb-8">
            <h2
              className={`text-2xl font-bold mb-3 ${
                verificationStatus.success ? "text-green-800" : "text-red-800"
              }`}
            >
              {verificationStatus.success
                ? "Email Verified!"
                : "Verification Failed"}
            </h2>

            {verificationStatus.success && verificationStatus.patientName && (
              <p className="text-lg text-gray-700 mb-2">
                Welcome, {verificationStatus.patientName}!
              </p>
            )}

            <p
              className={`text-sm ${
                verificationStatus.success ? "text-gray-600" : "text-red-600"
              }`}
            >
              {verificationStatus.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {verificationStatus.success ? (
              <>
                <Link
                  to="/login"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl inline-block"
                >
                  Continue to Login
                </Link>
                <Link
                  to="/"
                  className="w-full border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors inline-block"
                >
                  Back to Home
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl inline-block"
                >
                  Try Registration Again
                </Link>
                <Link
                  to="/"
                  className="w-full border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors inline-block"
                >
                  Back to Home
                </Link>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {verificationStatus.success
                ? "Your account is now active and ready to use."
                : "Need help? Contact our support team or try requesting a new verification email."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify;
