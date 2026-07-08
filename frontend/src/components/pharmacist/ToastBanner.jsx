import React from 'react';

const ToastBanner = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
      toast.type === 'success'
        ? 'bg-green-50 text-green-800 border-green-200'
        : 'bg-red-50 text-red-800 border-red-200'
    }`}>
      {toast.text}
    </div>
  );
};

export default ToastBanner;
