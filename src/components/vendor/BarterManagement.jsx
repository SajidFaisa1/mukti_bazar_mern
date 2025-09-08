import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowPathIcon, 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon, 
  EyeIcon, 
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon as ClockSolidIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/solid';
import CreateBarterModal from './CreateBarterModal';

const BarterManagement = () => {
  const [barters, setBarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBarter, setSelectedBarter] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [showCreateBarterModal, setShowCreateBarterModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBarters();
  }, [filter, statusFilter]);

  const fetchBarters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      if (!token) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }
      
      console.log('🔍 Fetching barters...');
      console.log('Filter:', filter, 'Status:', statusFilter);
      
      const params = new URLSearchParams();
      
      if (filter === 'received') {
        const response = await fetch('http://localhost:5005/api/barter/received', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            let filteredBarters = data.barters || [];
            
            if (statusFilter !== 'all') {
              filteredBarters = filteredBarters.filter(barter => barter.status === statusFilter);
            }
            
            setBarters(filteredBarters);
          } else {
            setError(`API Error: ${data.message || 'Unknown error'}`);
          }
        } else {
          const errorText = await response.text();
          setError(`HTTP Error: ${response.status} - ${errorText}`);
        }
      } else {
        if (filter === 'sent') {
          params.append('type', 'sent');
        } else if (filter === 'all') {
          params.append('type', 'all');
        }
        
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        
        const url = `http://localhost:5005/api/barter?${params}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBarters(data.barters || []);
          } else {
            setError(`API Error: ${data.message || 'Unknown error'}`);
          }
        } else {
          const errorText = await response.text();
          setError(`HTTP Error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending': 
        return { 
          color: 'bg-amber-100 text-amber-800 border-amber-200', 
          icon: ClockSolidIcon,
          bgColor: 'bg-amber-50'
        };
      case 'accepted': 
        return { 
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
          icon: CheckCircleIcon,
          bgColor: 'bg-emerald-50'
        };
      case 'rejected': 
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: XCircleIcon,
          bgColor: 'bg-red-50'
        };
      case 'counter-offered': 
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: ArrowPathIcon,
          bgColor: 'bg-blue-50'
        };
      case 'completed': 
        return { 
          color: 'bg-purple-100 text-purple-800 border-purple-200', 
          icon: CheckCircleIcon,
          bgColor: 'bg-purple-50'
        };
      case 'cancelled': 
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: XCircleIcon,
          bgColor: 'bg-gray-50'
        };
      case 'expired': 
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200', 
          icon: ExclamationTriangleIcon,
          bgColor: 'bg-orange-50'
        };
      default: 
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: ClockSolidIcon,
          bgColor: 'bg-gray-50'
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `৳${Number(amount).toLocaleString()}`;
  };

  // Accept barter offer
  const handleAcceptBarter = async (barterId, responseMessage = '') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch(`http://localhost:5005/api/barter/${barterId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responseMessage })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the barter in the list
          setBarters(prev => prev.map(barter => 
            barter._id === barterId 
              ? { ...barter, status: 'accepted', responseMessage, respondedAt: new Date() }
              : barter
          ));
          setShowDetailsModal(false);
          alert('Barter offer accepted successfully!');
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        alert('Failed to accept barter offer');
      }
    } catch (error) {
      console.error('Error accepting barter:', error);
      alert('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject barter offer
  const handleRejectBarter = async (barterId, responseMessage = '') => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch(`http://localhost:5005/api/barter/${barterId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ responseMessage })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the barter in the list
          setBarters(prev => prev.map(barter => 
            barter._id === barterId 
              ? { ...barter, status: 'rejected', responseMessage, respondedAt: new Date() }
              : barter
          ));
          setShowDetailsModal(false);
          alert('Barter offer rejected successfully!');
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        alert('Failed to reject barter offer');
      }
    } catch (error) {
      console.error('Error rejecting barter:', error);
      alert('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle counter offer
  const handleCounterOffer = async (barterId, counterOfferData) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
      
      const response = await fetch(`http://localhost:5005/api/barter/${barterId}/counter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(counterOfferData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the barter in the list
          setBarters(prev => prev.map(barter => 
            barter._id === barterId 
              ? { ...barter, status: 'counter-offered', counterOffer: counterOfferData, respondedAt: new Date() }
              : barter
          ));
          setShowCounterOfferModal(false);
          setShowDetailsModal(false);
          alert('Counter offer sent successfully!');
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        alert('Failed to send counter offer');
      }
    } catch (error) {
      console.error('Error sending counter offer:', error);
      alert('Network error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Modal Components with Tailwind styling
  const BarterDetailsModal = () => {
    if (!selectedBarter) return null;

    const statusConfig = getStatusConfig(selectedBarter.status);
    const StatusIcon = statusConfig.icon;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-2xl p-2">
                  <ArrowsRightLeftIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Barter Details - #{selectedBarter.barterNumber}
                </h2>
              </div>
              <button 
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200"
                onClick={() => setShowDetailsModal(false)}
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          
          {/* Modal Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${statusConfig.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      {selectedBarter.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Proposed</p>
                    <p className="text-sm text-gray-900 font-medium">{formatDate(selectedBarter.proposedAt)}</p>
                  </div>
                  {selectedBarter.respondedAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Responded</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(selectedBarter.respondedAt)}</p>
                    </div>
                  )}
                  {selectedBarter.expiresAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Expires</p>
                      <p className="text-sm text-gray-900 font-medium">{formatDate(selectedBarter.expiresAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Request */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Target Request
                </h3>
                {selectedBarter.targetProduct && typeof selectedBarter.targetProduct === 'object' ? (
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <div className="flex gap-4">
                      {selectedBarter.targetProduct.images && selectedBarter.targetProduct.images.length > 0 && (
                        <img 
                          src={selectedBarter.targetProduct.images[0]} 
                          alt={selectedBarter.targetProduct.name}
                          className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">{selectedBarter.targetProduct.name}</p>
                        <p className="text-sm text-gray-600 mb-1">Category: {selectedBarter.targetProduct.category}</p>
                        <p className="text-sm text-gray-600 mb-1">Business: {selectedBarter.targetProduct.businessName}</p>
                        <p className="text-sm font-semibold text-blue-600">Unit Price: {formatCurrency(selectedBarter.targetProduct.unitPrice)}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-100 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Quantity: {selectedBarter.targetQuantity}</span>
                      <span className="text-lg font-bold text-blue-600">Total: {formatCurrency(selectedBarter.targetValue)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <p className="font-semibold text-gray-900 mb-2">Product: {selectedBarter.targetProduct}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Quantity: {selectedBarter.targetQuantity}</span>
                      <span className="text-lg font-bold text-blue-600">{formatCurrency(selectedBarter.targetValue)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Offered Items */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Offered Items
                </h3>
                {selectedBarter.offeredItems && selectedBarter.offeredItems.length > 0 ? (
                  <div className="space-y-4">
                    {selectedBarter.offeredItems.map((item, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-emerald-200">
                        {item.product && typeof item.product === 'object' ? (
                          <div className="flex gap-4">
                            {item.product.images && item.product.images.length > 0 && (
                              <img 
                                src={item.product.images[0]} 
                                alt={item.product.name}
                                className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">{item.product.name}</p>
                              <p className="text-sm text-gray-600 mb-1">Category: {item.product.category}</p>
                              <p className="text-sm text-gray-600 mb-1">Business: {item.product.businessName}</p>
                              <p className="text-sm text-gray-600">Market Price: {formatCurrency(item.product.unitPrice)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="font-semibold text-gray-900 mb-2">Product: {item.product}</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <span className="text-xs font-medium text-gray-600">Quantity</span>
                            <p className="text-sm font-semibold text-gray-900">{item.quantity}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-600">Unit Price</span>
                            <p className="text-sm font-semibold text-emerald-600">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-600">Total Value</span>
                            <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.totalValue)}</p>
                          </div>
                          {item.notes && (
                            <div className="col-span-2 md:col-span-1">
                              <span className="text-xs font-medium text-gray-600">Notes</span>
                              <p className="text-sm text-gray-700">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="bg-white rounded-xl p-4 border-2 border-emerald-300">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-emerald-900">Total Offered Value:</span>
                        <span className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedBarter.totalOfferedValue)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-4 border border-emerald-200 text-center">
                    <p className="text-gray-600">No offered items specified</p>
                  </div>
                )}
              </div>

              {/* Value Analysis */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Value Analysis
                </h3>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Target Value</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedBarter.targetValue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Offered Value</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedBarter.totalOfferedValue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Difference</p>
                      <div className="flex items-center justify-center gap-2">
                        {selectedBarter.valueDifference >= 0 ? (
                          <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`text-xl font-bold ${selectedBarter.valueDifference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(selectedBarter.valueDifference))}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${selectedBarter.valueDifference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {selectedBarter.valueDifference >= 0 ? 'in favor' : 'additional needed'}
                      </p>
                    </div>
                  </div>
                  {selectedBarter.cashAdjustment !== 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-100 text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Cash Adjustment</p>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedBarter.cashAdjustment)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Information */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Vendor Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-semibold text-indigo-900 mb-3">Proposing Vendor</h4>
                    {selectedBarter.proposingVendor && typeof selectedBarter.proposingVendor === 'object' ? (
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium text-gray-600">Business:</span> {selectedBarter.proposingVendor.businessName}</p>
                        <p className="text-sm"><span className="font-medium text-gray-600">Name:</span> {selectedBarter.proposingVendor.sellerName}</p>
                        <p className="text-sm"><span className="font-medium text-gray-600">Email:</span> {selectedBarter.proposingVendor.email}</p>
                        <p className="text-sm"><span className="font-medium text-gray-600">Store ID:</span> {selectedBarter.proposingVendor.storeId}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">{selectedBarter.proposingVendorUid}</p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-semibold text-indigo-900 mb-3">Target Vendor</h4>
                    {selectedBarter.targetVendor && typeof selectedBarter.targetVendor === 'object' ? (
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium text-gray-600">Business:</span> {selectedBarter.targetVendor.businessName}</p>
                        <p className="text-sm"><span className="font-medium text-gray-600">Name:</span> {selectedBarter.targetVendor.sellerName}</p>
                        <p className="text-sm"><span className="font-medium text-gray-600">Email:</span> {selectedBarter.targetVendor.email}</p>
                        <p className="text-sm"><span className="font-medium text-gray-600">Store ID:</span> {selectedBarter.targetVendor.storeId}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">{selectedBarter.targetVendorUid}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              {(selectedBarter.proposalMessage || selectedBarter.responseMessage) && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-100">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    Messages
                  </h3>
                  <div className="space-y-4">
                    {selectedBarter.proposalMessage && (
                      <div className="bg-white rounded-xl p-4 border border-amber-200">
                        <p className="font-semibold text-amber-900 mb-2">Proposal Message:</p>
                        <p className="text-gray-700 leading-relaxed">{selectedBarter.proposalMessage}</p>
                      </div>
                    )}
                    {selectedBarter.responseMessage && (
                      <div className="bg-white rounded-xl p-4 border border-amber-200">
                        <p className="font-semibold text-amber-900 mb-2">Response Message:</p>
                        <p className="text-gray-700 leading-relaxed">{selectedBarter.responseMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Counter Offer */}
              {selectedBarter.counterOffer && (
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100">
                  <h3 className="text-lg font-semibold text-rose-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    Counter Offer
                  </h3>
                  <div className="bg-white rounded-xl p-4 border border-rose-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                        <p className="text-lg font-bold text-rose-600">{formatCurrency(selectedBarter.counterOffer.totalValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Cash Adjustment</p>
                        <p className="text-lg font-bold text-rose-600">{formatCurrency(selectedBarter.counterOffer.cashAdjustment)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-600 mb-1">Created</p>
                        <p className="text-sm text-gray-900">{formatDate(selectedBarter.counterOffer.createdAt)}</p>
                      </div>
                    </div>
                    {selectedBarter.counterOffer.message && (
                      <div className="mt-4 pt-4 border-t border-rose-100">
                        <p className="text-sm font-medium text-gray-600 mb-1">Message</p>
                        <p className="text-gray-700">{selectedBarter.counterOffer.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-3 justify-end">
              {selectedBarter.status === 'pending' && filter === 'received' && (
                <>
                  <button 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors duration-200 inline-flex items-center gap-2 disabled:opacity-50"
                    onClick={() => {
                      const message = prompt('Add a response message (optional):');
                      handleAcceptBarter(selectedBarter._id, message || '');
                    }}
                    disabled={actionLoading}
                  >
                    <CheckIcon className="w-4 h-4" />
                    Accept Offer
                  </button>
                  <button 
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors duration-200 inline-flex items-center gap-2 disabled:opacity-50"
                    onClick={() => {
                      console.log('Counter offer button clicked');
                      setShowCounterOfferModal(true);
                    }}
                    disabled={actionLoading}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Counter Offer
                  </button>
                  <button 
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors duration-200 inline-flex items-center gap-2 disabled:opacity-50"
                    onClick={() => {
                      const message = prompt('Add a rejection reason (optional):');
                      handleRejectBarter(selectedBarter._id, message || '');
                    }}
                    disabled={actionLoading}
                  >
                    <XMarkIcon className="w-4 h-4" />
                    Reject Offer
                  </button>
                </>
              )}
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-xl transition-colors duration-200"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CounterOfferModal = () => {
    const [counterItems, setCounterItems] = useState([{ product: '', quantity: 1, unitPrice: 0 }]);
    const [cashAdjustment, setCashAdjustment] = useState(0);
    const [message, setMessage] = useState('');

    const addCounterItem = () => {
      setCounterItems([...counterItems, { product: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeCounterItem = (index) => {
      setCounterItems(counterItems.filter((_, i) => i !== index));
    };

    const updateCounterItem = (index, field, value) => {
      const updated = [...counterItems];
      updated[index] = { ...updated[index], [field]: value };
      setCounterItems(updated);
    };

    const calculateTotalValue = () => {
      return counterItems.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmitCounter = () => {
      const counterOfferData = {
        items: counterItems.map(item => ({
          ...item,
          totalValue: item.quantity * item.unitPrice
        })),
        totalValue: calculateTotalValue(),
        cashAdjustment,
        message
      };
      
      console.log('Submitting counter offer:', counterOfferData);
      handleCounterOffer(selectedBarter._id, counterOfferData);
    };

    if (!selectedBarter) return null;

    const totalCounterValue = calculateTotalValue() + cashAdjustment;
    const differenceFromTarget = totalCounterValue - selectedBarter.targetValue;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-2xl p-2">
                  <ArrowPathIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Counter Offer - #{selectedBarter.barterNumber}
                </h2>
              </div>
              <button 
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200"
                onClick={() => setShowCounterOfferModal(false)}
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
          
          {/* Modal Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Original Request Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  📋 Original Request Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">Target Value</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedBarter.targetValue)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-emerald-200">
                    <p className="text-sm font-medium text-gray-600 mb-1">Originally Offered Value</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedBarter.totalOfferedValue)}</p>
                  </div>
                </div>
              </div>
              
              {/* Counter Offer Form */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  💰 Your Counter Offer
                </h3>
                
                <div className="space-y-4">
                  {counterItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Item #{index + 1}</h4>
                        {counterItems.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeCounterItem(index)} 
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors duration-200"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
                          <input
                            type="text"
                            placeholder="e.g., Fresh Tomatoes"
                            value={item.product}
                            onChange={(e) => updateCounterItem(index, 'product', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCounterItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (৳)</label>
                          <input
                            type="number"
                            placeholder="Unit Price"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateCounterItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-purple-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Item Total:</span>
                          <span className="text-lg font-bold text-purple-600">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addCounterItem} 
                    className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium py-3 px-4 rounded-xl transition-colors duration-200 inline-flex items-center justify-center gap-2 border-2 border-dashed border-purple-300"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Another Item
                  </button>
                </div>
              </div>

              {/* Cash Adjustment */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                  💵 Additional Cash Adjustment
                </h3>
                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <input
                    type="number"
                    placeholder="Additional cash amount (৳)"
                    min="0"
                    step="0.01"
                    value={cashAdjustment}
                    onChange={(e) => setCashAdjustment(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  />
                </div>
              </div>
              
              {/* Total Calculation */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-100">
                <h3 className="text-lg font-semibold text-amber-900 mb-4">📊 Counter Offer Summary</h3>
                <div className="bg-white rounded-xl p-4 border border-amber-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Items Value</p>
                      <p className="text-xl font-bold text-amber-600">{formatCurrency(calculateTotalValue())}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Cash Adjustment</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(cashAdjustment)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Counter Offer</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalCounterValue)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Difference from Target:</span>
                      <div className="flex items-center gap-2">
                        {differenceFromTarget >= 0 ? (
                          <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                        )}
                        <span className={`font-bold ${differenceFromTarget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(differenceFromTarget))}
                          {differenceFromTarget >= 0 ? ' over target' : ' under target'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  💬 Message (Optional)
                </h3>
                <div className="bg-white rounded-xl border border-gray-200">
                  <textarea
                    placeholder="Add a message explaining your counter offer..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-3 justify-end">
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors duration-200 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitCounter}
                disabled={actionLoading || !counterItems.some(item => item.product && item.quantity > 0)}
              >
                <ArrowPathIcon className="w-5 h-5" />
                Send Counter Offer
              </button>
              <button 
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-8 rounded-xl transition-colors duration-200"
                onClick={() => setShowCounterOfferModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <ArrowsRightLeftIcon className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Barter Offers</h3>
              <p className="text-gray-600">Please wait while we fetch your trading opportunities...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-32">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md w-full text-center">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Barters</h3>
              <p className="text-red-700 mb-6">{error}</p>
              <button 
                onClick={fetchBarters} 
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl mb-8 overflow-hidden">
          <div className="px-8 py-12 text-center relative">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="bg-white bg-opacity-20 rounded-2xl p-3">
                  <ArrowsRightLeftIcon className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white">Barter Management</h1>
              </div>
              <p className="text-blue-100 text-lg font-medium">Manage your product exchange offers efficiently</p>
            </div>
          </div>
          
          {/* Create Barter Button */}
          <div className="px-8 pb-6 relative z-10">
            <button 
              className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3 group"
              onClick={() => setShowCreateBarterModal(true)}
            >
              <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Create New Barter
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Filter by Type</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium"
              >
                <option value="all">🔄 All Offers</option>
                <option value="sent">📤 Sent by Me</option>
                <option value="received">📥 Received</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Filter by Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium"
              >
                <option value="all">🎯 All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="accepted">✅ Accepted</option>
                <option value="rejected">❌ Rejected</option>
                <option value="counter-offered">🔄 Counter Offered</option>
                <option value="completed">🎉 Completed</option>
                <option value="cancelled">🚫 Cancelled</option>
                <option value="expired">⏰ Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-amber-100 p-2 rounded-xl">
                    <ClockSolidIcon className="w-6 h-6 text-amber-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors duration-200">
                  {barters.filter(b => b.status === 'pending').length}
                </p>
              </div>
              <div className="bg-amber-50 rounded-full p-3 group-hover:bg-amber-100 transition-colors duration-200">
                <ClockSolidIcon className="w-8 h-8 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-emerald-100 p-2 rounded-xl">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Accepted</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200">
                  {barters.filter(b => b.status === 'accepted').length}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-full p-3 group-hover:bg-emerald-100 transition-colors duration-200">
                <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-100 p-2 rounded-xl">
                    <CheckCircleIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Completed</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-200">
                  {barters.filter(b => b.status === 'completed').length}
                </p>
              </div>
              <div className="bg-purple-50 rounded-full p-3 group-hover:bg-purple-100 transition-colors duration-200">
                <CheckCircleIcon className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-2 rounded-xl">
                    <ArrowsRightLeftIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                  {barters.length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-full p-3 group-hover:bg-blue-100 transition-colors duration-200">
                <ArrowsRightLeftIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Empty State or Barter List */}
        {barters.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <ArrowsRightLeftIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No Barter Offers Found</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {filter === 'received' 
                  ? "You haven't received any barter offers yet. Start engaging with other vendors!" 
                  : filter === 'sent' 
                  ? "You haven't sent any barter offers yet. Explore available products and start trading!"
                  : "You don't have any barter offers yet. Create your first barter to get started!"
                }
              </p>
              <button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3 group"
                onClick={() => setShowCreateBarterModal(true)}
              >
                <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                Create Your First Barter
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {barters.map(barter => {
              const statusConfig = getStatusConfig(barter.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={barter._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group overflow-hidden">
                  {/* Barter Card Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                          <ArrowsRightLeftIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">#{barter.barterNumber}</h3>
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {barter.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-medium">
                          {barter.proposedAt ? formatDate(barter.proposedAt) : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barter Content */}
                  <div className="p-6">
                    {/* Trade Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                      {/* Target Request */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Target Request
                        </h4>
                        {barter.targetProduct && typeof barter.targetProduct === 'object' ? (
                          <div className="flex gap-3">
                            {barter.targetProduct.images && barter.targetProduct.images.length > 0 && (
                              <img 
                                src={barter.targetProduct.images[0]} 
                                alt={barter.targetProduct.name}
                                className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{barter.targetProduct.name}</p>
                              <p className="text-sm text-gray-600">Qty: {barter.targetQuantity}</p>
                              <p className="text-sm font-semibold text-blue-600">{formatCurrency(barter.targetValue)}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-600">Quantity: {barter.targetQuantity}</p>
                            <p className="font-semibold text-blue-600">{formatCurrency(barter.targetValue)}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Exchange Arrow */}
                      <div className="flex items-center justify-center">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-3 shadow-lg">
                          <ArrowPathIcon className="w-6 h-6 text-white transform group-hover:rotate-180 transition-transform duration-500" />
                        </div>
                      </div>
                      
                      {/* Offered Items */}
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                        <h4 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          Offered Items
                        </h4>
                        {barter.offeredItems && barter.offeredItems.length > 0 ? (
                          <div className="space-y-2">
                            {barter.offeredItems.slice(0, 2).map((item, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                {item.product && typeof item.product === 'object' ? (
                                  <>
                                    {item.product.images && item.product.images.length > 0 && (
                                      <img 
                                        src={item.product.images[0]} 
                                        alt={item.product.name}
                                        className="w-8 h-8 object-cover rounded border border-gray-200"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                                      <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-700">{item.quantity} items</p>
                                )}
                              </div>
                            ))}
                            {barter.offeredItems.length > 2 && (
                              <p className="text-xs text-gray-500 font-medium">+{barter.offeredItems.length - 2} more items</p>
                            )}
                            <p className="text-sm font-semibold text-emerald-600 pt-2 border-t border-emerald-200">
                              Total: {formatCurrency(barter.totalOfferedValue)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">No items offered</p>
                        )}
                      </div>
                    </div>

                    {/* Value Analysis */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 mb-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Value Difference:</span>
                        <div className="flex items-center gap-2">
                          {barter.valueDifference >= 0 ? (
                            <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                          )}
                          <span className={`font-bold ${barter.valueDifference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(barter.valueDifference))}
                            {barter.valueDifference >= 0 ? ' in your favor' : ' additional needed'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Information */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4 border border-purple-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold text-purple-900">From: </span>
                          <span className="text-gray-700">
                            {barter.proposingVendor && typeof barter.proposingVendor === 'object' ? 
                              barter.proposingVendor.businessName : 
                              barter.proposingVendorUid
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-purple-900">To: </span>
                          <span className="text-gray-700">
                            {barter.targetVendor && typeof barter.targetVendor === 'object' ? 
                              barter.targetVendor.businessName : 
                              barter.targetVendorUid
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proposal Message */}
                    {barter.proposalMessage && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <p className="text-sm">
                          <span className="font-semibold text-blue-900">Message: </span>
                          <span className="text-gray-700">{barter.proposalMessage}</span>
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                      <button 
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
                        onClick={() => {
                          setSelectedBarter(barter);
                          setShowDetailsModal(true);
                        }}
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>
                      
                      {barter.status === 'pending' && filter === 'received' && (
                        <>
                          <button 
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center gap-2 disabled:opacity-50"
                            onClick={() => {
                              const message = prompt('Add a response message (optional):');
                              handleAcceptBarter(barter._id, message || '');
                            }}
                            disabled={actionLoading}
                          >
                            <CheckIcon className="w-4 h-4" />
                            Accept
                          </button>
                          <button 
                            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center gap-2 disabled:opacity-50"
                            onClick={() => {
                              const message = prompt('Add a rejection reason (optional):');
                              handleRejectBarter(barter._id, message || '');
                            }}
                            disabled={actionLoading}
                          >
                            <XMarkIcon className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {showDetailsModal && <BarterDetailsModal />}
        {showCounterOfferModal && <CounterOfferModal />}
        <CreateBarterModal 
          isOpen={showCreateBarterModal}
          onClose={() => setShowCreateBarterModal(false)}
          onSuccess={() => fetchBarters()}
        />
      </div>
    </div>
  );
};

export default BarterManagement;
