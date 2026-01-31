/**
 * Card component for consistent styling
 */
import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'bordered';
  color?: 'indigo' | 'purple' | 'blue' | 'green' | 'red' | 'yellow' | 'pink' | 'cyan' | 'gray';
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const colorStyles = {
  indigo: {
    default: 'bg-indigo-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-indigo-900 to-indigo-800',
    border: 'border-indigo-500',
  },
  purple: {
    default: 'bg-purple-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-purple-900 to-purple-800',
    border: 'border-purple-500',
  },
  blue: {
    default: 'bg-blue-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-blue-900 to-blue-800',
    border: 'border-blue-500',
  },
  green: {
    default: 'bg-green-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-green-900 to-green-800',
    border: 'border-green-500',
  },
  red: {
    default: 'bg-red-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-red-900 to-red-800',
    border: 'border-red-500',
  },
  yellow: {
    default: 'bg-yellow-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-yellow-900 to-yellow-800',
    border: 'border-yellow-500',
  },
  pink: {
    default: 'bg-pink-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-pink-900 to-pink-800',
    border: 'border-pink-500',
  },
  cyan: {
    default: 'bg-cyan-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-cyan-900 to-cyan-800',
    border: 'border-cyan-500',
  },
  gray: {
    default: 'bg-gray-900 bg-opacity-70',
    gradient: 'bg-gradient-to-br from-gray-900 to-gray-800',
    border: 'border-gray-500',
  },
};

export function Card({
  children,
  variant = 'default',
  color = 'gray',
  className = '',
  onClick,
  hoverable = false,
}: CardProps) {
  const styles = colorStyles[color];
  const bgStyle = variant === 'gradient' ? styles.gradient : styles.default;
  const borderStyle = variant === 'bordered' ? `border ${styles.border}` : '';
  
  return (
    <div
      className={`
        rounded-xl p-6 shadow-lg
        ${bgStyle}
        ${borderStyle}
        ${hoverable ? 'cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-bold text-white ${className}`}>
      {children}
    </h3>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-gray-300 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
