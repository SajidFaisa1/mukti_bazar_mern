import React, { useState } from 'react';
import axios from 'axios';
import { getAllDivision, getAllDistrict, getAllUpazila, getAllUnion } from 'bd-divisions-to-unions';

// Simple modal dialog for adding a new address
const AddAddressModal = ({ token, uid, role, onClose, onSaved }) => {
  const [form, setForm] = useState({
    label: 'Home',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    division: '',
    divisionName: '',
    district: '',
    districtName: '',
    union: '',
    city: '',
    state: '',
    zip: '',
    country: 'Bangladesh',
    isDefault: false,
  });

  const divisions = Object.values(getAllDivision('en'));
  const districtMap = getAllDistrict('en');
  const upazilaMap = getAllUpazila('en');
  const unionMap = getAllUnion('en');

  const [districtOptions, setDistrictOptions] = useState([]);
  const [unionOptions, setUnionOptions] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'division') {
      setDistrictOptions(districtMap[value] || []);
      setUnionOptions([]);
      const divText = e.target.options[e.target.selectedIndex]?.text || value;
      setForm((p) => ({ ...p, division: value, divisionName: divText, district: '', districtName: '', union: '' }));
    } else if (name === 'district') {
      // union options from all upazila/unions under district
      const upazilasArr = upazilaMap[value] || [];
      const names = [];
      upazilasArr.forEach((u) => {
        names.push(u.title);
        const unionsArr = unionMap[u.value] || [];
        unionsArr.forEach((un) => names.push(un.title));
      });
      setUnionOptions(names);
      const text = e.target.options[e.target.selectedIndex]?.text || value;
      setForm((p) => ({ ...p, district: value, districtName: text, union: '' }));
    } else {
      setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        label: form.label,
        name: form.name,
        phone: form.phone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.union || form.city,
        state: form.divisionName || form.state || '',
        district: form.districtName || '',
        uid: uid, // Include the user's uid
        role: role || 'client', // Include the user's role
        zip: form.zip,
        country: form.country,
        isDefault: form.isDefault,
      };
      await axios.post('/api/addresses', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Could not save address');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add New Address</h2>
        <form onSubmit={handleSubmit} className="address-form">
          <label>
            Label
            <input name="label" value={form.label} onChange={handleChange} />
          </label>
          <label>
            Full Name
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={handleChange} required />
          </label>
          <label>
            House/Flat number, Road name
            <input name="addressLine1" value={form.addressLine1} onChange={handleChange} required />
          </label>
          <label>
            Area/Union
            <input name="addressLine2" value={form.addressLine2} onChange={handleChange} />
          </label>

          <label>
            Division
            <select name="division" value={form.division} onChange={handleChange} required>
              <option value="">Select division</option>
              {divisions.map((d) => (
                <option key={d.value} value={d.value}>{d.title}</option>
              ))}
            </select>
          </label>

          {districtOptions.length > 0 && (
            <label>
              District
              <select name="district" value={form.district} onChange={handleChange} required>
                <option value="">Select district</option>
                {districtOptions.map((d) => (
                  <option key={d.value} value={d.value}>{d.title}</option>
                ))}
              </select>
            </label>
          )}

          {unionOptions.length > 0 && (
            <label>
              Union / Area
              <select name="union" value={form.union} onChange={handleChange} required>
                <option value="">Select area</option>
                {unionOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            ZIP / Postcode
            <input name="zip" value={form.zip} onChange={handleChange} />
          </label>
          <label>
            Country
            <input name="country" value={form.country} onChange={handleChange} />
          </label>
          <label className="checkbox">
            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} /> Set as default address
          </label>

          <div className="actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Address</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAddressModal;
