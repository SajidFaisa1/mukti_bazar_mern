import React from 'react';
import DiscoverStores from '../home/DiscoverStores';

const DiscoverStoresPage = () => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-primary-50/40 to-white py-10">
      <div className="max-w-[90%] xl:max-w-[85%] mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">Discover Stores</h1>
          <p className="text-sm text-primary-700/70 mt-2 max-w-2xl">Explore top-rated and newly joined verified vendors. Click a store to view its products, ratings, and trust indicators.</p>
        </header>
        <DiscoverStores limit={24} />
      </div>
    </main>
  );
};

export default DiscoverStoresPage;
