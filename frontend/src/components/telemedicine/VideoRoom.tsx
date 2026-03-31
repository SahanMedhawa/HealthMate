import React from 'react';
import {
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';

interface VideoRoomProps {
  joinLink: string;
  roomId: string;
  patientName?: string;
  doctorName?: string;
  onClose: () => void;
}

const VideoRoom: React.FC<VideoRoomProps> = ({
  joinLink,
  roomId,
  patientName,
  doctorName,
  onClose,
}) => {
  const openInNewTab = () => window.open(joinLink, '_blank', 'noopener');

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white shrink-0">
        <div className="flex items-center gap-3">
          <VideoCameraIcon className="h-5 w-5 text-green-400" />
          <span className="text-sm font-medium truncate">
            {doctorName && patientName
              ? `${doctorName} ↔ ${patientName}`
              : `Room ${roomId.slice(0, 8)}…`}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-green-600/30 text-green-300 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openInNewTab}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            <span className="hidden sm:inline">New Tab</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-600/80 rounded-lg transition-colors"
            title="Leave call"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={joinLink}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        title="Telemedicine Video Call"
      />
    </div>
  );
};

export default VideoRoom;
