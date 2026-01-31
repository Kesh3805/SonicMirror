/**
 * Loading components for better UX
 */
import React from 'react';

// Spinner component
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function Spinner({ size = 'md', color = 'white' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Skeleton component for loading placeholders
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({
  className = '',
  width,
  height,
  variant = 'rectangular',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-700';
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6">
      <Skeleton height={24} width="60%" className="mb-4" />
      <Skeleton height={16} width="100%" className="mb-2" />
      <Skeleton height={16} width="80%" className="mb-2" />
      <Skeleton height={16} width="40%" />
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton height={16} width="70%" className="mb-2" />
        <Skeleton height={12} width="40%" />
      </div>
    </div>
  );
}

// Artist card skeleton
export function ArtistCardSkeleton() {
  return (
    <div className="flex flex-col items-center p-4">
      <Skeleton variant="circular" width={80} height={80} className="mb-3" />
      <Skeleton height={16} width={80} className="mb-2" />
      <Skeleton height={12} width={60} />
    </div>
  );
}

// Track card skeleton
export function TrackCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-900 bg-opacity-50 rounded-lg">
      <Skeleton variant="rectangular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton height={16} width="60%" className="mb-2" />
        <Skeleton height={12} width="40%" />
      </div>
    </div>
  );
}

// Full page loading
export interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-700 text-white">
      <Spinner size="lg" />
      <p className="mt-4 text-lg">{message}</p>
    </div>
  );
}

// Loading overlay
export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, message, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center">
            <Spinner size="md" />
            {message && <p className="mt-2 text-sm text-white">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Spinner;
