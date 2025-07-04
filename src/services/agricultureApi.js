const BASE_URL = 'http://localhost:5005/agriculture'; // Replace with actual API URL

// Mock API implementation
const mockApi = {
  // Locations with their characteristics
  locations: {
    'Dhaka': {
      climate: 'subtropical',
      rainfall: 'high',
      soil: 'alluvial',
      bestCrops: ['Rice', 'Vegetables', 'Fruits']
    },
    'Chittagong': {
      climate: 'tropical',
      rainfall: 'very high',
      soil: 'sandy',
      bestCrops: ['Rice', 'Tea', 'Fruits']
    },
    'Rajshahi': {
      climate: 'dry',
      rainfall: 'moderate',
      soil: 'clay',
      bestCrops: ['Wheat', 'Jute', 'Vegetables']
    },
    'Khulna': {
      climate: 'coastal',
      rainfall: 'high',
      soil: 'sandy',
      bestCrops: ['Rice', 'Fish', 'Coconut']
    },
    'Sylhet': {
      climate: 'hilly',
      rainfall: 'very high',
      soil: 'red',
      bestCrops: ['Tea', 'Cardamom', 'Rubber']
    }
  },

  // Products with their characteristics
  products: {
    'Rice': {
      climate: ['subtropical', 'tropical'],
      rainfall: ['high', 'moderate'],
      soil: ['alluvial', 'clay'],
      season: ['year-round'],
      profit: 0.8,
      risk: 0.2
    },
    'Potato': {
      climate: ['subtropical'],
      rainfall: ['moderate'],
      soil: ['clay'],
      season: ['winter'],
      profit: 0.7,
      risk: 0.3
    },
    'Onion': {
      climate: ['subtropical', 'dry'],
      rainfall: ['moderate', 'low'],
      soil: ['clay'],
      season: ['winter', 'summer'],
      profit: 0.6,
      risk: 0.4
    },
    'Tomato': {
      climate: ['subtropical'],
      rainfall: ['moderate'],
      soil: ['sandy'],
      season: ['winter', 'summer'],
      profit: 0.7,
      risk: 0.3
    },
    'Cucumber': {
      climate: ['subtropical'],
      rainfall: ['high'],
      soil: ['sandy'],
      season: ['summer'],
      profit: 0.6,
      risk: 0.4
    },
    'Eggplant': {
      climate: ['subtropical'],
      rainfall: ['moderate'],
      soil: ['clay'],
      season: ['year-round'],
      profit: 0.6,
      risk: 0.4
    },
    'Lentils': {
      climate: ['dry'],
      rainfall: ['low'],
      soil: ['clay'],
      season: ['winter'],
      profit: 0.5,
      risk: 0.5
    },
    'Peas': {
      climate: ['subtropical'],
      rainfall: ['moderate'],
      soil: ['clay'],
      season: ['winter'],
      profit: 0.6,
      risk: 0.4
    },
    'Garlic': {
      climate: ['subtropical'],
      rainfall: ['moderate'],
      soil: ['clay'],
      season: ['winter'],
      profit: 0.6,
      risk: 0.4
    },
    'Ginger': {
      climate: ['subtropical'],
      rainfall: ['high'],
      soil: ['clay'],
      season: ['winter'],
      profit: 0.7,
      risk: 0.3
    }
  },

  // Generate mock price data
  generatePriceData: (product, month = 'All', location = 'Dhaka') => {
    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const months = [];
    const prices = [];
    
    // Generate data for last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(startOfYear);
      date.setMonth(date.getMonth() + i);
      months.push(date.toLocaleString('default', { month: 'short' }));
      
      // Base prices for different products
      let basePrice;
      switch (product.toLowerCase()) {
        case 'rice':
          basePrice = 50;
          break;
        case 'potato':
          basePrice = 20;
          break;
        case 'onion':
          basePrice = 30;
          break;
        case 'tomato':
          basePrice = 35;
          break;
        case 'cucumber':
          basePrice = 25;
          break;
        case 'eggplant':
          basePrice = 40;
          break;
        case 'lentils':
          basePrice = 60;
          break;
        case 'peas':
          basePrice = 22;
          break;
        case 'garlic':
          basePrice = 45;
          break;
        case 'ginger':
          basePrice = 55;
          break;
        default:
          basePrice = 50;
      }
      
      // Get location data
      const locationData = mockApi.locations[location];
      const productData = mockApi.products[product];
      
      // Calculate location-based factors
      let locationFactor = 1.0;
      
      // Climate compatibility
      if (productData.climate.includes(locationData.climate)) {
        locationFactor *= 1.1;
      } else {
        locationFactor *= 0.9;
      }
      
      // Soil compatibility
      if (productData.soil.includes(locationData.soil)) {
        locationFactor *= 1.1;
      } else {
        locationFactor *= 0.9;
      }
      
      // Rainfall compatibility
      if (productData.rainfall.includes(locationData.rainfall)) {
        locationFactor *= 1.1;
      } else {
        locationFactor *= 0.9;
      }
      
      // Seasonal variation
      const seasonalFactor = date.getMonth() < 6 ? 1.1 : 0.9; // Higher prices in first half of year
      
      // Add random daily price variation
      const variation = Math.random() * 10 - 5;
      
      // Add trend based on product type
      const trendFactor = Math.random() * 0.1 - 0.05;
      
      // Calculate final price
      const price = Math.round((basePrice * seasonalFactor + variation + trendFactor * i) * locationFactor);
      prices.push(price);
    }
    
    // Generate prediction for next month
    const lastPrice = prices[prices.length - 1];
    const nextMonthPrediction = Math.round(lastPrice * (1 + Math.random() * 0.1 - 0.05));
    const predictionTrend = nextMonthPrediction > lastPrice ? 'up' : 'down';
    
    // Calculate AI recommendation score
    const productInfo = mockApi.products[product];
    const locationInfo = mockApi.locations[location];
    
    const compatibilityScore = (
      productInfo.climate.includes(locationInfo.climate) ? 1 : 0 +
      productInfo.soil.includes(locationInfo.soil) ? 1 : 0 +
      productInfo.rainfall.includes(locationInfo.rainfall) ? 1 : 0
    ) / 3;
    
    const seasonalityScore = productInfo.season.includes(month.toLowerCase()) ? 1 : 0.5;
    
    const profitScore = productInfo.profit;
    const riskScore = 1 - productInfo.risk;
    
    const recommendationScore = (
      compatibilityScore * 0.4 +
      seasonalityScore * 0.3 +
      profitScore * 0.2 +
      riskScore * 0.1
    ) * 100;
    
    return {
      months,
      prices,
      lastUpdated: new Date().toISOString(),
      prediction: {
        nextMonth: nextMonthPrediction,
        trend: predictionTrend
      },
      recommendation: {
        score: Math.round(recommendationScore),
        compatibility: compatibilityScore,
        seasonality: seasonalityScore,
        profit: profitScore,
        risk: riskScore,
        climateMatch: productInfo.climate.includes(locationInfo.climate),
        soilMatch: productInfo.soil.includes(locationInfo.soil),
        rainfallMatch: productInfo.rainfall.includes(locationInfo.rainfall)
      }
    };
  }
};

// Mock API functions
export const fetchProductList = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(Object.keys(mockApi.products)), 1000);
  });
};

export const fetchProductPrices = async (product, month = 'All', location = 'Dhaka') => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockApi.generatePriceData(product, month, location)), 1000);
  });
};

// For development, use these mock functions
export const mockProductPrices = (product, month = 'All', location = 'Dhaka') => {
  return mockApi.generatePriceData(product, month, location);
};

// Get list of locations
export const fetchLocations = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(Object.keys(mockApi.locations)), 1000);
  });
};

// Get AI recommendations for all products in a location
export const getAIRecommendations = async (month = 'All', location = 'Dhaka') => {
  const allProducts = await fetchProductList();
  const recommendations = await Promise.all(
    allProducts.map(async (product) => {
      const data = await fetchProductPrices(product, month, location);
      return {
        product,
        ...data.recommendation
      };
    })
  );
  
  // Sort by recommendation score
  recommendations.sort((a, b) => b.score - a.score);
  
  return recommendations;
};

