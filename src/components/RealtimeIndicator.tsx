'use client';

/**
 * Real-Time Indicator Component
 * Shows visual feedback that data is being updated in real-time via WebSocket
 */

import React from 'react';

export interface RealtimeIndicatorProps {
  isConnected: boolean;
  isError?: boolean;
  provider?: string;
  lastUpdateTime?: number | null;
  className?: string;
  showLabel?: boolean;
  showTimestamp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'compact' | 'inline';
}

/**
 * Format timestamp for display
 */
function formatUpdateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '';

  const now = Date.now();
  const elapsed = now - timestamp;

  // Less than 1 minute
  if (elapsed < 60000) {
    return 'now';
  }

  // Less than 1 hour
  if (elapsed < 3600000) {
    const minutes = Math.floor(elapsed / 60000);
    return `${minutes}m ago`;
  }

  // Less than 1 day
  if (elapsed < 86400000) {
    const hours = Math.floor(elapsed / 3600000);
    return `${hours}h ago`;
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Pulse animation for real-time indicator
 */
const PulseAnimation = ({ isConnected }: { isConnected: boolean }) => (
  <style>{`
    @keyframes pulse-realtime {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes pulse-ring {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }

    .realtime-pulse {
      ${isConnected ? 'animation: pulse-realtime 1.5s ease-in-out infinite;' : ''}
    }

    .realtime-ring {
      ${isConnected ? 'animation: pulse-ring 2s infinite;' : ''}
    }
  `}</style>
);

/**
 * Compact indicator (just a dot with hover tooltip)
 */
const CompactIndicator = ({ isConnected, isError, provider }: RealtimeIndicatorProps) => {
  const bgColor = isError ? 'bg-red-500' : isConnected ? 'bg-green-500' : 'bg-gray-400';
  const tooltipText = isError ? 'Connection error' : isConnected ? `Connected via ${provider || 'WebSocket'}` : 'Disconnected';

  return (
    <div className="relative group">
      <div className={`w-3 h-3 rounded-full ${bgColor} realtime-pulse`} />
      <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {tooltipText}
      </div>
    </div>
  );
};

/**
 * Badge indicator (with label)
 */
const BadgeIndicator = ({ isConnected, isError, provider, lastUpdateTime, showTimestamp }: RealtimeIndicatorProps) => {
  const bgColor = isError ? 'bg-red-100' : isConnected ? 'bg-green-100' : 'bg-gray-100';
  const textColor = isError ? 'text-red-700' : isConnected ? 'text-green-700' : 'text-gray-700';
  const dotColor = isError ? 'bg-red-500' : isConnected ? 'bg-green-500' : 'bg-gray-400';
  const statusText = isError ? 'Error' : isConnected ? 'Live' : 'Offline';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <div className={`w-2 h-2 rounded-full ${dotColor} realtime-pulse`} />
      <span>{statusText}</span>
      {provider && <span className="text-opacity-70">({provider})</span>}
      {showTimestamp && lastUpdateTime && (
        <span className="text-opacity-70">• {formatUpdateTime(lastUpdateTime)}</span>
      )}
    </div>
  );
};

/**
 * Inline indicator (minimal, with icon)
 */
const InlineIndicator = ({ isConnected, isError, lastUpdateTime, size = 'md' }: RealtimeIndicatorProps) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const iconColor = isError ? 'text-red-500' : isConnected ? 'text-green-500' : 'text-gray-400';

  return (
    <div className="flex items-center gap-1">
      {isConnected ? (
        <svg className={`${sizeClass} ${iconColor} realtime-pulse`} fill="currentColor" viewBox="0 0 24 24">
          {/* Lightning bolt icon */}
          <path d="M13 2H11v7H8l5 7v-4h3l-5-7h1V2m0-2h3l-6 8h3l-5 8h3l-6 8z" />
        </svg>
      ) : isError ? (
        <svg className={`${sizeClass} ${iconColor}`} fill="currentColor" viewBox="0 0 24 24">
          {/* X circle icon */}
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg className={`${sizeClass} ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {/* Signal off icon */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h.01" />
        </svg>
      )}
      {lastUpdateTime && (
        <span className="text-xs text-gray-500">{formatUpdateTime(lastUpdateTime)}</span>
      )}
    </div>
  );
};

/**
 * Main RealtimeIndicator component
 */
export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({
  isConnected,
  isError = false,
  provider = 'WebSocket',
  lastUpdateTime,
  className = '',
  showLabel = true,
  showTimestamp = false,
  size = 'md',
  variant = 'badge',
}) => {
  return (
    <>
      <PulseAnimation isConnected={isConnected} />
      <div className={className}>
        {variant === 'compact' && (
          <CompactIndicator
            isConnected={isConnected}
            isError={isError}
            provider={provider}
          />
        )}
        {variant === 'badge' && (
          <BadgeIndicator
            isConnected={isConnected}
            isError={isError}
            provider={provider}
            lastUpdateTime={lastUpdateTime}
            showTimestamp={showTimestamp}
          />
        )}
        {variant === 'inline' && (
          <InlineIndicator
            isConnected={isConnected}
            isError={isError}
            lastUpdateTime={lastUpdateTime}
            size={size}
          />
        )}
      </div>
    </>
  );
};

/**
 * Wrapper component for widget headers
 */
export interface WidgetRealtimeIndicatorProps {
  isConnected: boolean;
  isError?: boolean;
  provider?: string;
  lastUpdateTime?: number | null;
  compact?: boolean;
}

export const WidgetRealtimeIndicator: React.FC<WidgetRealtimeIndicatorProps> = React.memo(({
  isConnected,
  isError = false,
  provider,
  lastUpdateTime,
  compact = false,
}) => {
  if (compact) {
    return (
      <RealtimeIndicator
        isConnected={isConnected}
        isError={isError}
        provider={provider}
        variant="compact"
      />
    );
  }

  return (
    <RealtimeIndicator
      isConnected={isConnected}
      isError={isError}
      provider={provider}
      lastUpdateTime={lastUpdateTime}
      showTimestamp={true}
      variant="badge"
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.isError === nextProps.isError &&
    prevProps.provider === nextProps.provider &&
    prevProps.lastUpdateTime === nextProps.lastUpdateTime &&
    prevProps.compact === nextProps.compact
  );
});

WidgetRealtimeIndicator.displayName = 'WidgetRealtimeIndicator';
