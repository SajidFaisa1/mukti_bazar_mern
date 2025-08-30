import React, { useEffect, useState } from 'react';
import { useApiLoading } from '../../hooks/useLoadingStates.jsx';
import { useLoading } from '../../contexts/LoadingContext';

const ExampleComponent = () => {
  const { startLoading, stopLoading } = useApiLoading();
  const { loadingStates } = useLoading();
  const [data, setData] = useState(null);

  const handleApiCall = async () => {
    try {
      startLoading("Fetching data...");
      
      // Simulate API call
      const response = await fetch('/api/data');
      const result = await response.json();
      
      setData(result);
    } catch (error) {
      console.error('API call failed:', error);
    } finally {
      stopLoading();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Example Component</h2>
      
      <button
        onClick={handleApiCall}
        disabled={loadingStates.api}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loadingStates.api ? 'Loading...' : 'Fetch Data'}
      </button>
      
      {data && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ExampleComponent;
