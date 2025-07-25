// Delivery calculation service for wholesale e-commerce
class DeliveryCalculator {
  constructor() {
    // Delivery rates per kg for weight-based items
    this.weightBasedRate = 7; // 7tk per kg
    
    // Delivery rates for piece-based items
    this.pieceBasedRate = 70; // 70tk for any quantity of pieces
    
    // Weight thresholds for different delivery methods (in kg)
    this.weightThresholds = {
      standard: { min: 0, max: 50 }, // 0-50kg
      semiTruck: { min: 51, max: 500 }, // 51-500kg
      truck: { min: 501, max: Infinity } // 500kg+
    };
    
    // Base delivery fees for different methods
    this.baseDeliveryFees = {
      pickup: 0,
      standard: 0, // Will be calculated based on weight
      semiTruck: 200, // Base fee + weight calculation
      truck: 500, // Base fee + weight calculation
      negotiated: 0 // Will be set manually
    };
  }

  // Calculate total weight of cart items
  calculateTotalWeight(cartItems) {
    let totalWeight = 0;
    
    cartItems.forEach(item => {
      // Get unitType from item directly or from populated product
      const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
      const quantity = item.quantity || 0;
      
      console.log(`Item: ${item.name || item.product?.name || 'Unknown'}, UnitType: ${unitType}, Quantity: ${quantity}`);
      
      // Weight-based units - convert each unit to kg first, then multiply by quantity
      if (['kg', 'kilogram', 'ton', 'tonne', 'liter', 'litre', 'bag'].includes(unitType)) {
        let unitWeightInKg = 0;
        
        // Convert each unit type to kg
        if (unitType === 'kg' || unitType === 'kilogram') {
          unitWeightInKg = 1; // 1kg = 1kg
        } else if (unitType === 'ton' || unitType === 'tonne') {
          unitWeightInKg = 1000; // 1 ton = 1000kg
        } else if (unitType === 'liter' || unitType === 'litre') {
          unitWeightInKg = 1; // 1 liter ≈ 1kg (for most liquids)
        } else if (unitType === 'bag') {
          unitWeightInKg = 25; // 1 bag ≈ 25kg (assumption for wholesale bags)
        }
        
        // Calculate total weight for this item: unitWeight × quantity
        const itemTotalWeight = unitWeightInKg * quantity;
        totalWeight += itemTotalWeight;
        
        console.log(`Unit weight: ${unitWeightInKg}kg, Quantity: ${quantity}, Item total: ${itemTotalWeight}kg`);
        console.log(`Running total weight: ${totalWeight}kg`);
      }
      // For pieces, we don't add to weight (handled separately in delivery calculation)
    });
    
    console.log(`Final total weight: ${totalWeight}kg`);
    return Math.round(totalWeight * 100) / 100; // Round to 2 decimal places
  }

  // Get available delivery methods based on cart contents
  getAvailableDeliveryMethods(cartItems, totalWeight) {
    const methods = [];
    
    // Always available
    methods.push({
      id: 'pickup',
      name: 'Pickup by Yourself',
      description: 'Collect from our warehouse/farm',
      fee: 0,
      estimatedDays: '0',
      icon: '🏪'
    });

    methods.push({
      id: 'negotiated',
      name: 'Negotiated Delivery',
      description: 'Seller will arrange delivery with negotiated charges',
      fee: 0,
      estimatedDays: '2-5',
      icon: '🤝',
      isNegotiated: true
    });

    // Check if cart has piece-based items
    const hasPieceItems = cartItems.some(item => {
      const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
      return unitType === 'pcs' || unitType === 'pieces' || unitType === 'piece';
    });

    // Check if cart has weight-based items
    const hasWeightItems = cartItems.some(item => {
      const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
      return ['kg', 'kilogram', 'ton', 'tonne', 'liter', 'litre', 'bag'].includes(unitType);
    });

    // For piece-based items ONLY (no weight items), add standard delivery with fixed rate
    if (hasPieceItems && !hasWeightItems) {
      methods.push({
        id: 'standard',
        name: 'Standard Delivery (Pieces)',
        description: 'Fixed rate for piece-based items',
        fee: this.pieceBasedRate,
        estimatedDays: '3-5',
        icon: '📦'
      });
    }

    // For weight-based items, add appropriate delivery methods based on weight
    if (totalWeight > 0) {
      if (totalWeight <= this.weightThresholds.standard.max) {
        methods.push({
          id: 'standard',
          name: 'Standard Delivery',
          description: `For orders up to ${this.weightThresholds.standard.max}kg`,
          fee: Math.max(totalWeight * this.weightBasedRate, 50), // Minimum 50tk
          estimatedDays: '3-5',
          icon: '🚚',
          weightInfo: `${totalWeight}kg × ${this.weightBasedRate}tk/kg`
        });
      }

      if (totalWeight >= this.weightThresholds.semiTruck.min && totalWeight <= this.weightThresholds.semiTruck.max) {
        methods.push({
          id: 'semi-truck',
          name: 'Semi-Truck Delivery',
          description: `For orders ${this.weightThresholds.semiTruck.min}-${this.weightThresholds.semiTruck.max}kg`,
          fee: this.baseDeliveryFees.semiTruck + (totalWeight * this.weightBasedRate),
          estimatedDays: '5-7',
          icon: '🚛',
          weightInfo: `Base ${this.baseDeliveryFees.semiTruck}tk + ${totalWeight}kg × ${this.weightBasedRate}tk/kg`
        });
      }

      if (totalWeight >= this.weightThresholds.truck.min) {
        methods.push({
          id: 'truck',
          name: 'Full Truck Delivery',
          description: `For orders ${this.weightThresholds.truck.min}kg+`,
          fee: this.baseDeliveryFees.truck + (totalWeight * this.weightBasedRate),
          estimatedDays: '7-10',
          icon: '🚚',
          weightInfo: `Base ${this.baseDeliveryFees.truck}tk + ${totalWeight}kg × ${this.weightBasedRate}tk/kg`
        });
      }
    }

    return methods;
  }

  // Calculate delivery fee for a specific method
  calculateDeliveryFee(method, cartItems, totalWeight, negotiatedFee = 0) {
    switch (method) {
      case 'pickup':
        return 0;
        
      case 'negotiated':
        return negotiatedFee;
        
      case 'standard':
        // Check if it's piece-based or weight-based
        const hasPieceItems = cartItems.some(item => {
          const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
          return unitType === 'pcs' || unitType === 'pieces' || unitType === 'piece';
        });
        
        const hasWeightItems = cartItems.some(item => {
          const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
          return ['kg', 'kilogram', 'ton', 'tonne', 'liter', 'litre', 'bag'].includes(unitType);
        });
        
        if (hasPieceItems && !hasWeightItems) {
          return this.pieceBasedRate;
        } else {
          return Math.max(totalWeight * this.weightBasedRate, 50);
        }
        
      case 'semi-truck':
        return this.baseDeliveryFees.semiTruck + (totalWeight * this.weightBasedRate);
        
      case 'truck':
        return this.baseDeliveryFees.truck + (totalWeight * this.weightBasedRate);
        
      default:
        return 0;
    }
  }

  // Get estimated delivery days
  getEstimatedDeliveryDays(method) {
    const deliveryTimes = {
      pickup: '0',
      standard: '3-5',
      'semi-truck': '5-7',
      truck: '7-10',
      negotiated: '2-5'
    };
    
    return deliveryTimes[method] || '3-5';
  }

  // Validate if a delivery method is available for the cart
  isDeliveryMethodAvailable(method, cartItems, totalWeight) {
    const availableMethods = this.getAvailableDeliveryMethods(cartItems, totalWeight);
    return availableMethods.some(m => m.id === method);
  }

  // Get recommended delivery method based on cart contents
  getRecommendedDeliveryMethod(cartItems, totalWeight) {
    const hasPieceItems = cartItems.some(item => {
      const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
      return unitType === 'pcs' || unitType === 'pieces' || unitType === 'piece';
    });

    const hasWeightItems = cartItems.some(item => {
      const unitType = (item.unitType || item.product?.unitType || 'pcs').toLowerCase();
      return ['kg', 'kilogram', 'ton', 'tonne', 'liter', 'litre', 'bag'].includes(unitType);
    });

    // If only piece items (no weight items), recommend standard
    if (hasPieceItems && !hasWeightItems) {
      return 'standard';
    }

    // For weight-based items, recommend based on weight thresholds
    if (hasWeightItems && totalWeight > 0) {
      if (totalWeight <= this.weightThresholds.standard.max) {
        return 'standard';
      } else if (totalWeight <= this.weightThresholds.semiTruck.max) {
        return 'semi-truck';
      } else {
        return 'truck';
      }
    }

    // Default fallback
    return 'pickup';
  }
}

module.exports = new DeliveryCalculator();
