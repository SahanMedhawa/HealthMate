import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/user/Navbar";
import Footer from "../../components/Footer";

const Pricing: React.FC = () => {
  // Pricing plans data
  const pricingPlans = [
    {
      name: "Basic",
      price: 29,
      period: "month",
      description: "Perfect for small clinics getting started",
      features: [
        "Up to 5 doctors",
        "Basic appointment scheduling",
        "Patient management",
        "Email support",
        "Standard reporting"
      ],
      popular: false,
      color: "blue"
    },
    {
      name: "Professional",
      price: 79,
      period: "month",
      description: "Ideal for growing medical practices",
      features: [
        "Up to 25 doctors",
        "Advanced scheduling",
        "Patient portal",
        "SMS notifications",
        "Advanced analytics",
        "Priority support",
        "Custom branding"
      ],
      popular: true,
      color: "purple"
    },
    {
      name: "Enterprise",
      price: 149,
      period: "month",
      description: "For large healthcare organizations",
      features: [
        "Unlimited doctors",
        "Multi-location support",
        "API integration",
        "Custom workflows",
        "Advanced security",
        "24/7 phone support",
        "White-label solution",
        "Custom integrations"
      ],
      popular: false,
      color: "green"
    }
  ];

  const getColorClasses = (color: string, popular: boolean) => {
    const baseClasses = "relative bg-white rounded-2xl shadow-lg border-2 p-8 hover:shadow-2xl transition-all duration-300";

    if (popular) {
      return `${baseClasses} border-blue-500 transform scale-105`;
    }

    switch (color) {
      case "blue":
        return `${baseClasses} border-blue-200 hover:border-blue-300`;
      case "purple":
        return `${baseClasses} border-purple-200 hover:border-purple-300`;
      case "green":
        return `${baseClasses} border-green-200 hover:border-green-300`;
      default:
        return `${baseClasses} border-gray-200 hover:border-gray-300`;
    }
  };

  const getButtonClasses = (color: string, popular: boolean) => {
    if (popular) {
      return "w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1";
    }

    switch (color) {
      case "blue":
        return "w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1";
      case "purple":
        return "w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1";
      case "green":
        return "w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1";
      default:
        return "w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-30 blur-xl"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-teal-100 rounded-full opacity-40 blur-lg"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-50 rounded-full opacity-25 blur-2xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Choose Your{" "}
              <span className="text-blue-600">Perfect Plan</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Select the perfect HealthMate plan for your healthcare practice. All plans include our core features with no hidden fees.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {pricingPlans.map((plan, index) => (
            <div key={plan.name} className={getColorClasses(plan.color, plan.popular)}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center space-y-6">
                {/* Plan Header */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button className={getButtonClasses(plan.color, plan.popular)}>
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Get Started</span>
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Why Choose HealthMate?</h2>
            <p className="text-gray-600">Everything you need to modernize your healthcare practice</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">HIPAA Compliant</h3>
              <p className="text-gray-600">Enterprise-grade security and compliance to protect patient data</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">99.9% Uptime</h3>
              <p className="text-gray-600">Reliable service with guaranteed availability for your practice</p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock assistance to keep your practice running smoothly</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-600">Everything you need to know about HealthMate pricing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
                <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
                <p className="text-gray-600">We offer a 14-day free trial for all plans with no credit card required.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">We accept all major credit cards, PayPal, and bank transfers for enterprise plans.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you offer custom pricing?</h3>
                <p className="text-gray-600">Yes, we offer custom pricing for large healthcare organizations with specific needs.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is training included?</h3>
                <p className="text-gray-600">Yes, all plans include comprehensive training and onboarding for your team.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600">Yes, you can cancel your subscription at any time with no cancellation fees.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
