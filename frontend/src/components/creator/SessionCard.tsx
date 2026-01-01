/**
 * SessionCard Component
 * Displays a session summary card in the creator history view
 */

import React from 'react';
import { SessionListItem } from '@/lib/api';

interface SessionCardProps {
  session: SessionListItem;
  onViewSession: (sessionId: string) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onViewSession }) => {
  // Check if this is a webinar session
  const isWebinar = (session as any).session_type === 'webinar';

  // Status badge colors
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Truncate blog type if too long
  const truncateText = (text: string, maxLength: number = 150): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get display title and theme based on session type
  const displayTitle = isWebinar ? (session as any).webinar_topic : session.primary_keyword;
  const themeColor = isWebinar ? 'purple' : 'blue';
  const borderColor = isWebinar ? 'border-purple-200' : 'border-gray-200';
  const progressBarColor = isWebinar ? 'bg-purple-600' : 'bg-blue-600';

  return (
    <div className={`bg-white border ${borderColor} rounded-lg p-6 hover:shadow-lg transition-shadow duration-200`}>
      {/* Header with session type badge, title, and status */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            {isWebinar && (
              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                WEBINAR
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {displayTitle}
            </h3>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            session.status
          )}`}
        >
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </span>
      </div>

      {/* Session details - different for webinar vs blog */}
      {isWebinar ? (
        <div className="text-sm text-gray-600 mb-4 space-y-1">
          {(session as any).guest_name && (
            <p className="text-purple-600">Guest: {(session as any).guest_name}</p>
          )}
          <p className="capitalize">{(session as any).content_format || 'ghostwritten'} format</p>
        </div>
      ) : (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {truncateText(session.blog_type)}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{session.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${progressBarColor} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${session.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-sm text-gray-600 mb-4">
        <div>
          <span className="font-medium">{session.steps_completed}</span> of{' '}
          <span className="font-medium">{session.total_steps}</span> steps
        </div>
        {session.steps_skipped > 0 && (
          <div className="text-yellow-600">
            {session.steps_skipped} skipped
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-xs text-gray-500 mb-4 space-y-1">
        <div>
          <span className="font-medium">Created:</span>{' '}
          {formatDate(session.created_at)}
        </div>
        <div>
          <span className="font-medium">Last Updated:</span>{' '}
          {formatDate(session.updated_at)}
        </div>
      </div>

      {/* Action button - Resume for active/paused, View for others */}
      <button
        onClick={() => onViewSession(session.session_id)}
        className={`w-full ${
          session.status === 'active' || session.status === 'paused'
            ? 'bg-green-600 hover:bg-green-700'
            : isWebinar
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200`}
      >
        {session.status === 'active' || session.status === 'paused' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Resume Session
          </span>
        ) : (
          'View Workflow'
        )}
      </button>
    </div>
  );
};

export default SessionCard;
