import React from 'react';

interface AlertProps {
  type?: 'success' | 'error' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const Alert = ({ type = 'error', children, className }: AlertProps) => {
  const alertStyles = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className={`p-4 mb-4 rounded-lg ${alertStyles[type]} ${className || ''}`}>
      <AlertDescription>{children}</AlertDescription>
    </div>
  );
};

const AlertDescription = ({ children }: { children: React.ReactNode }) => {
  return <p>{children}</p>;
};

export { Alert, AlertDescription };
