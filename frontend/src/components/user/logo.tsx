import React from "react";

const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">M</span>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full"></div>
      </div>
      <span className="text-xl font-bold text-gray-800">HealthMate</span>
    </div>
  );
};

export default Logo;
