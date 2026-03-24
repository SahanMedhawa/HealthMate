import React from "react";

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-blue-100 py-6 mt-12">
    <div className="max-w-5xl mx-auto px-4 text-center text-gray-500 text-sm">
      &copy; {new Date().getFullYear()} HealthMate. All rights reserved.
    </div>
  </footer>
);

export default Footer;