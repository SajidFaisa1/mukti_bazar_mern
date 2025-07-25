import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AddAddressModal from './AddAddressModal';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';

// Very simple view of the logged-in user's addresses
const AddressBook = () => {
  const vendorAuth = useVendorAuth() || {};
  const clientAuth = useClientAuth() || {};
  const token = vendorAuth.token || clientAuth.token || sessionStorage.getItem('vendorToken') || sessionStorage.getItem('clientToken') || '';
  
  // Determine current user info and role
  const currentUser = vendorAuth.user || clientAuth.user;
  const userRole = vendorAuth.user ? 'vendor' : (clientAuth.user ? 'client' : null);

  const [addresses, setAddresses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAddresses = async () => {
    try {
      const res = await axios.get('/api/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(res.data);
    } catch (err) {
      setError('Could not load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadAddresses();
  }, [token]);


  if (loading) return <p>Loading…</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const formatRegion = (addr) => {
    const parts = [];
    if (addr.city) parts.push(addr.city);
    if (addr.district) parts.push(addr.district);
    if (addr.state && !/^\d+$/.test(addr.state)) parts.push(addr.state);
    return parts.join(', ');
  };

  return (
    <div className="address-book container">
      <h1>Address Book</h1>
      <button className="btn-primary" onClick={() => setShowModal(true)}>Add Address</button>
      {addresses.length === 0 && <p>No addresses yet.</p>}
      <ul className="address-list">
        {addresses.map((addr) => (
          <li key={addr._id} className={`address-item ${addr.isDefault ? 'default' : ''}`}>
            <strong>{addr.label}</strong> — {addr.name}, {addr.phone}
            <br />
            {addr.addressLine1}, {addr.addressLine2 && `${addr.addressLine2}, `}
            {formatRegion(addr)}{addr.zip ? `, ${addr.zip}` : ''}, {addr.country}
            {addr.isDefault && <span className="badge">Default</span>}
          </li>
        ))}
      </ul>
      <Link to="/settings" className="btn">Back to Settings</Link>
      {showModal && (
        <AddAddressModal 
          token={token} 
          uid={currentUser?.uid}
          role={userRole}
          onClose={() => setShowModal(false)} 
          onSaved={loadAddresses} 
        />
      )}
    </div>
  );
};

export default AddressBook;
