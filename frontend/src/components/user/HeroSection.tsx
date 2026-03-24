import React from "react";
import { Link } from "react-router-dom";
import DashboardMockup from "./DashboardMockup";

const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-30 blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-teal-100 rounded-full opacity-40 blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-50 rounded-full opacity-25 blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Skip the Wait.{" "}
                <span className="text-blue-600">Streamline Care.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                HealthMate modernizes clinic operations with smart scheduling,
                real-time queue management, and patient reminders.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-center"
              >
                Book a Demo
              </Link>
              <button className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200">
                View Features
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center space-x-6 pt-8">
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">500+</span>{" "}
                Clinics Trust Us
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">99.9%</span>{" "}
                Uptime
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">HIPAA</span>{" "}
                Compliant
              </div>
            </div>
          </div>

          {/* Right Column - Dashboard Mockup */}
          <div className="relative">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
