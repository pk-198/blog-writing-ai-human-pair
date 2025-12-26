/**
 * StatCard Component
 * Reusable card component for displaying single metric
 */

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: 'improving' | 'declining' | 'stable';
  trendLabel?: string;
  tooltip?: string;
  colorScheme?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'indigo';
  size?: 'small' | 'medium' | 'large';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  trendLabel,
  tooltip,
  colorScheme = 'blue',
  size = 'medium'
}) => {
  // Color scheme mapping
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      icon: 'text-blue-500'
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
      icon: 'text-green-500'
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'border-yellow-200',
      icon: 'text-yellow-500'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
      icon: 'text-red-500'
    },
    gray: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      icon: 'text-gray-500'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
      icon: 'text-indigo-500'
    }
  };

  const colors = colorClasses[colorScheme];

  // Size classes
  const sizeClasses = {
    small: {
      card: 'p-4',
      value: 'text-2xl',
      title: 'text-xs',
      subtitle: 'text-xs'
    },
    medium: {
      card: 'p-6',
      value: 'text-3xl',
      title: 'text-sm',
      subtitle: 'text-sm'
    },
    large: {
      card: 'p-8',
      value: 'text-4xl',
      title: 'text-base',
      subtitle: 'text-base'
    }
  };

  const sizes = sizeClasses[size];

  // Trend indicator
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend) {
      case 'improving':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'declining':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`bg-white border ${colors.border} rounded-lg ${sizes.card} hover:shadow-md transition-shadow duration-200`}
      title={tooltip}
    >
      {/* Header with icon and title */}
      <div className="flex items-center justify-between mb-2">
        <div className={`font-medium ${colors.text} ${sizes.title} uppercase tracking-wide`}>
          {title}
        </div>
        {icon && <div className={colors.icon}>{icon}</div>}
      </div>

      {/* Value */}
      <div className={`font-bold text-gray-900 ${sizes.value} mb-1`}>
        {value}
      </div>

      {/* Subtitle or Trend */}
      {(subtitle || trend) && (
        <div className="flex items-center gap-2">
          {trend && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              {trendLabel && (
                <span className={`text-xs ${
                  trend === 'improving' ? 'text-green-600' :
                  trend === 'declining' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
          {subtitle && (
            <div className={`${colors.text} ${sizes.subtitle}`}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
