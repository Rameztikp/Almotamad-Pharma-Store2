import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Heart, ShoppingCart } from 'lucide-react';

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'cart':
        return <ShoppingCart className="h-5 w-5 text-blue-600" />;
      case 'favorite':
        return <Heart className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'cart':
        return 'bg-blue-50 border-blue-200';
      case 'favorite':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-fadeIn">
      <div className={`flex items-center p-4 rounded-lg border shadow-lg ${getBgColor()}`}>
        {getIcon()}
        <span className="mr-3 text-gray-800">{message}</span>
        <button
          onClick={onClose}
          className="mr-auto text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;

