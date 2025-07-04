import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { 
  mockProductPrices, 
  fetchProductList,
  fetchLocations,
  getAIRecommendations 
} from '../services/agricultureApi';
import Chat from './Chat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import './Analysis.css';

const Analysis = () => {
  const [selectedProduct, setSelectedProduct] = useState('Rice');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('Dhaka');
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productList = await fetchProductList();
        setProducts(productList);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchProducts();

    const fetchLocationsData = async () => {
      try {
        const locationsList = await fetchLocations();
        setLocations(locationsList);
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocationsData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await mockProductPrices(selectedProduct, selectedMonth, selectedLocation);
        setProductData(data);
        
        // Get recommendations for all products
        const recs = await getAIRecommendations(selectedMonth, selectedLocation);
        setRecommendations(recs);
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProduct, selectedMonth, selectedLocation]);

  if (loading) {
    return (
      <div className="analysis-container">
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  const chartOptions = {
    chart: {
      type: 'line',
      height: 350,
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth'
    },
    xaxis: {
      categories: productData?.months || []
    },
    yaxis: {
      title: {
        text: 'Price (BDT/kg)'
      }
    },
    title: {
      text: `Price Analysis for ${selectedProduct}`,
      align: 'center'
    }
  };

  const chartSeries = [
    {
      name: selectedProduct,
      data: productData?.prices || []
    }
  ];

  const insights = productData ? {
    average: Math.round(productData.prices.reduce((a, b) => a + b, 0) / productData.prices.length),
    trend: productData.prices[productData.prices.length - 1] > productData.prices[0] ? 'Increasing' : 'Decreasing',
    range: `${Math.min(...productData.prices)} - ${Math.max(...productData.prices)} BDT/kg`,
    lastUpdated: new Date(productData.lastUpdated).toLocaleString(),
    prediction: productData.prediction,
    recommendation: productData.recommendation
  } : null;

  return (
    <div className="analysis-container">
      <div className="chat-toggle">
        <button 
          onClick={() => setShowChat(!showChat)}
          className={`chat-toggle-btn ${showChat ? 'active' : ''}`}
          title={showChat ? 'Hide Chat' : 'Show Chat'}
        >
          <FontAwesomeIcon icon={faComments} size="lg" />
        </button>
      </div>
      <div className="chat-toggle">
        <button 
          onClick={() => setShowChat(!showChat)}
          className={`chat-toggle-btn ${showChat ? 'active' : ''}`}
        >
          {showChat ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>
      {showChat && (
        <div className="chat-section">
          <Chat />
        </div>
      )}
      <div className="analysis-header">
        <h1>AI-Based Agricultural Price Analysis</h1>
        <p>Track and analyze agricultural product prices in Bangladesh</p>
      </div>

      <div className="analysis-filters">
        <div className="filter-group">
          <label>Location:</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="filter-select"
          >
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Product:</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="filter-select"
          >
            {products.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Months</option>
            <option value="Jan">January</option>
            <option value="Feb">February</option>
            <option value="Mar">March</option>
            <option value="Apr">April</option>
            <option value="May">May</option>
            <option value="Jun">June</option>
            <option value="Jul">July</option>
            <option value="Aug">August</option>
            <option value="Sep">September</option>
            <option value="Oct">October</option>
            <option value="Nov">November</option>
            <option value="Dec">December</option>
          </select>
        </div>
      </div>

      <div className="analysis-chart">
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="line"
        />
      </div>

      <div className="analysis-insights">
        <h2>Insights</h2>
        <div className="insight-cards">
          <div className="insight-card">
            <h3>Average Price</h3>
            <p>{insights?.average} BDT/kg</p>
          </div>
          <div className="insight-card">
            <h3>Price Trend</h3>
            <p>{insights?.trend}</p>
          </div>
          <div className="insight-card">
            <h3>Price Range</h3>
            <p>{insights?.range}</p>
          </div>
          <div className="insight-card">
            <h3>Last Updated</h3>
            <p>{insights?.lastUpdated}</p>
          </div>
          <div className="insight-card">
            <h3>Next Month Prediction</h3>
            <p>{insights?.prediction?.nextMonth} BDT/kg</p>
          </div>
          <div className="insight-card">
            <h3>Prediction Trend</h3>
            <p>{insights?.prediction?.trend === 'up' ? 'Expected Increase' : 'Expected Decrease'}</p>
          </div>
        </div>
      </div>

      <div className="ai-recommendations">
        <h2>AI Recommendations</h2>
        <div className="recommendation-cards">
          {recommendations.map((rec, index) => (
            <div key={index} className="recommendation-card">
              <h3>{rec.product}</h3>
              <div className="recommendation-score">
                <span>Score: {rec.score}%</span>
                <div className="score-bar">
                  <div className="score-fill" style={{ width: `${rec.score}%` }}></div>
                </div>
              </div>
              <div className="recommendation-details">
                <p>Climate Match: {rec.climateMatch ? '✅' : '❌'}</p>
                <p>Soil Match: {rec.soilMatch ? '✅' : '❌'}</p>
                <p>Rainfall Match: {rec.rainfallMatch ? '✅' : '❌'}</p>
                <p>Seasonal Suitability: {rec.seasonality * 100}%</p>
                <p>Profit Potential: {rec.profit * 100}%</p>
                <p>Risk Level: {rec.risk * 100}%</p>
              </div>
              <div className="recommendation-cta">
                {rec.score >= 80 && (
                  <button className="recommend-button">Highly Recommended</button>
                )}
                {rec.score >= 60 && rec.score < 80 && (
                  <button className="recommend-button">Recommended</button>
                )}
                {rec.score < 60 && (
                  <button className="recommend-button" disabled>Not Recommended</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analysis;
