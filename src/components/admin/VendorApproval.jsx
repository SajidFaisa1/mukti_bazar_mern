import React, { useState, useEffect, useMemo } from 'react';
import { getAllDivision, getAllDistrict, getAllUnion } from 'bd-divisions-to-unions';
import { 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Phone, 
  Mail, 
  Building, 
  FileText, 
  Image as ImageIcon, 
  Shield,
  AlertTriangle,
  Calendar,
  User,
  Fingerprint,
  DollarSign,
  Package,
  Award,
  Globe
} from 'lucide-react';

const VendorApproval = ({ token }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Location mapping for Bangladesh divisions/districts/unions
  const divisionMap = useMemo(() => {
    const obj = {};
    Object.values(getAllDivision('en')).forEach(d => { obj[d.value] = d.title; });
    return obj;
  }, []);
  
  const districtMap = useMemo(() => {
    const obj = {};
    const all = getAllDistrict('en');
    Object.keys(all).forEach(divId => {
      all[divId].forEach(dist => { obj[dist.value] = dist.title; });
    });
    return obj;
  }, []);
  
  const unionMap = useMemo(() => {
    const obj = {};
    const all = getAllUnion('en');
    Object.keys(all).forEach(upId => {
      all[upId].forEach(un => { obj[un.value] = un.title; });
    });
    return obj;
  }, []);

  const formatAddress = (addr) => {
    if (!addr) return 'Not provided';
    const parts = [];
    if (addr.division && divisionMap[addr.division]) parts.push(divisionMap[addr.division]);
    if (addr.district && districtMap[addr.district]) parts.push(districtMap[addr.district]);
    if (addr.union && unionMap[addr.union]) parts.push(unionMap[addr.union]);
    if (parts.length === 0) return 'Not provided';
    return parts.join(', ');
  };

  useEffect(() => {
    if (token) {
      loadVendors();
    }
  }, [token]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5005/api/vendors/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load vendors');
      }
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (vendorId) => {
    try {
      await fetch(`http://localhost:5005/api/vendors/approve/${vendorId}`, { 
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      loadVendors();
    } catch (error) {
      console.error('Error approving vendor:', error);
    }
  };

  const handleDecline = async (vendorId) => {
    try {
      await fetch(`http://localhost:5005/api/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      loadVendors();
    } catch (error) {
      console.error('Error declining vendor:', error);
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low_risk': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium_risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high_risk': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'suspended': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle size={64} className="mx-auto text-emerald-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Pending Approvals</h3>
        <p className="text-gray-500">All vendor applications have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending Vendor Approvals</h2>
          <p className="text-gray-600 mt-1">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} awaiting approval</p>
        </div>
        <button 
          onClick={loadVendors}
          className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {vendors.map(vendor => (
          <VendorCard key={vendor.id} vendor={vendor} onApprove={handleApprove} onDecline={handleDecline} />
        ))}
      </div>
    </div>
  );
};

const VendorCard = ({ vendor, onApprove, onDecline }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low_risk': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium_risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high_risk': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'suspended': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return 'Not provided';
    const parts = [];
    if (addr.division) parts.push(addr.division);
    if (addr.district) parts.push(addr.district);
    if (parts.length === 0) return 'Not provided';
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Compact Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {vendor.businessName || vendor.sellerName || 'Unnamed Business'}
            </h3>
            <p className="text-sm text-gray-600 truncate">{vendor.email}</p>
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-col gap-1 ml-2">
            {vendor.verificationLevel && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getRiskLevelColor(vendor.verificationLevel)}`}>
                {vendor.verificationLevel.split('_')[0].toUpperCase()}
              </span>
            )}
            {vendor.trustScore !== undefined && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                {vendor.trustScore}/100
              </span>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone size={12} />
              {vendor.phone || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {formatAddress(vendor.address)}
            </span>
          </div>
          
          {vendor.businessType && (
            <div className="flex items-center gap-1">
              <Building size={12} />
              <span className="capitalize">{vendor.businessType}</span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Content */}
      <div className="p-4">
        {/* Key Information Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          {vendor.yearsInBusiness !== undefined && (
            <div>
              <span className="text-gray-500">Experience:</span>
              <p className="font-medium">{vendor.yearsInBusiness} years</p>
            </div>
          )}
          
          {vendor.expectedMonthlyVolume && (
            <div>
              <span className="text-gray-500">Volume:</span>
              <p className="font-medium capitalize">{vendor.expectedMonthlyVolume.replace(/-/g, ' ')}</p>
            </div>
          )}

          {vendor.businessRegistrationNumber && (
            <div className="col-span-2">
              <span className="text-gray-500">Registration:</span>
              <p className="font-medium font-mono text-xs">{vendor.businessRegistrationNumber}</p>
            </div>
          )}
        </div>

        {/* Primary Products (if any) */}
        {vendor.primaryProducts && vendor.primaryProducts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Products:</p>
            <div className="flex flex-wrap gap-1">
              {vendor.primaryProducts.slice(0, 3).map((product, idx) => (
                <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                  {product}
                </span>
              ))}
              {vendor.primaryProducts.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  +{vendor.primaryProducts.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Warning Flags */}
        {vendor.fraudFlags && vendor.fraudFlags.length > 0 && (
          <div className="mb-4 p-2 bg-red-50 rounded border border-red-200">
            <div className="flex items-center gap-1 text-red-700 text-xs font-semibold mb-1">
              <AlertTriangle size={12} />
              {vendor.fraudFlags.length} Warning{vendor.fraudFlags.length !== 1 ? 's' : ''}
            </div>
            <p className="text-red-600 text-xs">{vendor.fraudFlags[0]}</p>
            {vendor.fraudFlags.length > 1 && (
              <p className="text-red-500 text-xs">+{vendor.fraudFlags.length - 1} more</p>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mb-3 py-2 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          {isExpanded ? 'Show Less' : 'Show Details'}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 mb-4 text-xs">
            {/* Security Information */}
            {vendor.securityInfo && (
              <div className="p-2 bg-gray-50 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Security Info</h4>
                <div className="space-y-1">
                  {vendor.securityInfo.riskScore !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk Score:</span>
                      <span className="font-medium">{vendor.securityInfo.riskScore}/100</span>
                    </div>
                  )}
                  {vendor.securityInfo.ipAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">IP Address:</span>
                      <span className="font-mono">{vendor.securityInfo.ipAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banking Information */}
            {vendor.bankAccountDetails && (vendor.bankAccountDetails.accountNumber || vendor.bankAccountDetails.bankName) && (
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <h4 className="font-semibold text-gray-700 mb-1">Banking</h4>
                <div className="space-y-1">
                  {vendor.bankAccountDetails.bankName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank:</span>
                      <span className="font-medium">{vendor.bankAccountDetails.bankName}</span>
                    </div>
                  )}
                  {vendor.bankAccountDetails.accountNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account:</span>
                      <span className="font-mono">***{vendor.bankAccountDetails.accountNumber.slice(-4)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="grid grid-cols-3 gap-2">
              {(vendor.shopLogo?.url || vendor.shopLogo?.filename) && (
                <div className="text-center">
                  <div className="aspect-square rounded border border-gray-200 overflow-hidden mb-1">
                    <img 
                      src={vendor.shopLogo?.url ?? `http://localhost:5005/uploads/${vendor.shopLogo.filename}`} 
                      alt="Logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-gray-600">Logo</span>
                </div>
              )}
              
              {(vendor.kycDocument?.url || vendor.kycDocument?.filename) && (
                <div className="text-center">
                  <a 
                    href={vendor.kycDocument?.url ?? `http://localhost:5005/uploads/${vendor.kycDocument.filename}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center aspect-square bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    <FileText size={16} className="text-blue-600 mb-1" />
                    <span className="text-blue-600">KYC</span>
                  </a>
                </div>
              )}
              
              {(vendor.farmingLicense?.url || vendor.farmingLicense?.filename) && (
                <div className="text-center">
                  <a 
                    href={vendor.farmingLicense?.url ?? `http://localhost:5005/uploads/${vendor.farmingLicense.filename}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center aspect-square bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                  >
                    <FileText size={16} className="text-green-600 mb-1" />
                    <span className="text-green-600">License</span>
                  </a>
                </div>
              )}
            </div>

            {/* Description */}
            {vendor.description && (
              <div className="p-2 bg-gray-50 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Description</h4>
                <p className="text-gray-600 text-xs leading-relaxed">{vendor.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(vendor.id)}
            className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
          >
            <CheckCircle size={16} />
            Approve
          </button>
          <button
            onClick={() => onDecline(vendor.id)}
            className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
          >
            <XCircle size={16} />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorApproval;
