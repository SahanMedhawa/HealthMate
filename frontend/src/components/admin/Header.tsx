import React from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  user: {
    name: string;
    role: string;
    avatar?: string;
  };
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const location = useLocation();
  
  const getPageTitle = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="ml-1 text-sm text-gray-500">Online</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span className="text-white font-medium">
                  {user.name.charAt(0)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;