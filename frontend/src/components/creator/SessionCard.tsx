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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header with keyword and status */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
          {session.primary_keyword}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            session.status
          )}`}
        >
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </span>
      </div>

      {/* Blog type description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {truncateText(session.blog_type)}
      </p>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{session.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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

      {/* View button */}
      <button
        onClick={() => onViewSession(session.session_id)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
      >
        View Workflow
      </button>
    </div>
  );
};

export default SessionCard;
