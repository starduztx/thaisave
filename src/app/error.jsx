"use client"; // This is required for error boundaries

// File: error.jsx
// Location: src/app/error.jsx
// Created for ThaiSave Project

import { useEffect } from 'react';

const Error = ({ error, reset }) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        Oops! Something went wrong.
      </h2>
      <p className="text-gray-600 mb-6">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
};

export default Error;