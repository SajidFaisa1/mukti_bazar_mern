# Negotiation Dashboard Testing Guide

## Testing the Updated Pricing Logic

### What I Fixed:
1. **Product Data Display**: Fixed `negotiation.product` → `negotiation.productId` to properly show product images, names, and prices
2. **Added Original Total**: Now shows both "Original Total" and "Offer Total" 
3. **Perspective-Based Savings/Loss**:
   - **For Buyers** (who make offers): Shows "Potential Savings" or "Premium Offer"
   - **For Sellers** (who receive offers): Shows "Potential Loss" or "Premium Gained"

### Test Scenarios:

#### Scenario 1: Buyer Offers Less Than Original Price
- **Setup**: Buyer offers ৳80 for a product originally priced at ৳100
- **Expected Results**:
  - **Buyer sees**: "💰 Potential Savings: ৳20 (20%)" (green background)
  - **Seller sees**: "📉 Potential Loss: ৳20 (20%)" (red background)

#### Scenario 2: Buyer Offers More Than Original Price  
- **Setup**: Buyer offers ৳120 for a product originally priced at ৳100
- **Expected Results**:
  - **Buyer sees**: "📈 Premium Offer: ৳20 (+20%)" (green background)
  - **Seller sees**: "💰 Premium Gained: ৳20 (+20%)" (green background)

#### Scenario 3: Offer Equals Original Price
- **Setup**: Buyer offers ৳100 for a product originally priced at ৳100
- **Expected Results**: No savings/loss row should appear

### How to Test:

1. **Start Backend**: 
   ```bash
   cd backend && npm run dev
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   ```

3. **Create Test Negotiations**:
   - Log in as a client/buyer
   - Find a product and click "💰 Negotiate Price"
   - Create negotiations with different price scenarios
   - Check the dashboard at `/negotiations`

4. **Test Both Perspectives**:
   - Log in as the buyer → Check savings display
   - Log in as the vendor/seller → Check loss display
   - Verify the console logs show correct participant roles

5. **Verify Display Elements**:
   - ✅ Product image appears
   - ✅ Product name appears  
   - ✅ Original price shows correctly
   - ✅ Original total appears before offer total
   - ✅ Savings/loss logic matches user perspective
   - ✅ Color coding: Green for savings/gains, Red for losses

### Debug Information:
- Console logs will show participant info for verification
- Check browser developer tools for any errors
- Verify the API returns `productId` populated data

### Files Modified:
- `NegotiationCard.jsx`: Updated pricing display and savings logic
- `NegotiationCard.css`: Added `.loss` styling for red background
- `NegotiationModal.jsx`: Fixed product data access (`productId` instead of `product`)

Let me know if the product images/names appear correctly and if the savings/loss logic shows properly for different user perspectives!
