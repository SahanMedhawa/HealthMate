import React from "react";

const DashboardMockup: React.FC = () => {
  return (
    <div className="relative">
      {/* Main Dashboard Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform hover:scale-105 transition-transform duration-300">
        {/* Dashboard Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Clinic Dashboard
                </h3>
                <p className="text-blue-100 text-sm">Today, Dec 15, 2024</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-white text-sm">Live</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">24</div>
              <div className="text-xs text-blue-600">Today's Appointments</div>
            </div>
            <div className="bg-teal-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">6</div>
              <div className="text-xs text-teal-600">In Queue</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">18</div>
              <div className="text-xs text-green-600">Completed</div>
            </div>
          </div>

          {/* Current Patient */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">JS</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">John Smith</h4>
                  <p className="text-sm text-gray-600">Consultation • Room 2</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  In Session
                </div>
                <p className="text-xs text-gray-500 mt-1">Started 10:30 AM</p>
              </div>
            </div>
          </div>

          {/* Next Patients Queue */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 text-sm flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Next in Queue
            </h4>

            {/* Queue Items */}
            <div className="space-y-2">
              {[
                {
                  name: "Sarah Johnson",
                  time: "11:00 AM",
                  type: "Check-up",
                  wait: "5 min",
                  status: "waiting",
                  initials: "SJ",
                },
                {
                  name: "Michael Davis",
                  time: "11:15 AM",
                  type: "Follow-up",
                  wait: "20 min",
                  status: "waiting",
                  initials: "MD",
                },
                {
                  name: "Emily Wilson",
                  time: "11:30 AM",
                  type: "Consultation",
                  wait: "35 min",
                  status: "scheduled",
                  initials: "EW",
                },
              ].map((patient, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {patient.initials}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">
                        {patient.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {patient.type} • {patient.time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        patient.status === "waiting"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {patient.status === "waiting" ? "Waiting" : "Scheduled"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ~{patient.wait}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex space-x-2">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
              Call Next
            </button>
            <button className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors">
              Add Walk-in
            </button>
          </div>
        </div>
      </div>

      {/* Floating Notification */}
      <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
        <div className="flex items-start space-x-2">
          <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <div className="text-sm font-medium text-gray-800">
              SMS Reminder Sent
            </div>
            <div className="text-xs text-gray-600">
              Sarah Johnson • 11:00 AM appointment
            </div>
            <div className="text-xs text-gray-400 mt-1">2 minutes ago</div>
          </div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute -z-10 top-10 left-10 w-20 h-20 bg-blue-100 rounded-full opacity-20 blur-xl"></div>
      <div className="absolute -z-10 bottom-10 right-10 w-16 h-16 bg-teal-100 rounded-full opacity-30 blur-lg"></div>
    </div>
  );
};

export default DashboardMockup;
