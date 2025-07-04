import React, { useState } from 'react';
import Carousel from './Carousel';
import FeaturedItems from './FeaturedItems';
import FeatureCards from './FeatureCards';

import './Home.css';
import '../styles/FeatureCards.css';

const Home = () => {
  const [filter, setFilter] = useState('all');
  const [categories] = useState([
    'all', 'vegetables', 'fruits', 'dairy', 'grains', 'spices'
  ]);

  return (
    <div className="home-container">
      {/* Hero Carousel */}
      <Carousel />

      {/* Feature Cards */}
      <FeatureCards />

      {/* Featured Items Section */}
      <FeaturedItems />

      {/* Products Section */}
      <div className="products-section">
        <div className="filter-container">
          <h2>Our Products</h2>
          <div className="filter-buttons">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Home;
