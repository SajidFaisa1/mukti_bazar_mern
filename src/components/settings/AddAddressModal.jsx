import React, { useState } from 'react';
import axios from 'axios';
import { getAllDivision, getAllDistrict, getAllUpazila, getAllUnion } from 'bd-divisions-to-unions';

// Enhanced Tailwind-based modal dialog for adding a new address
const AddAddressModal = ({ token, uid, role, onClose, onSaved }) => {
  const apiBase = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5005';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const divisions = Object.values(getAllDivision('en'));
  const districtMap = getAllDistrict('en');
  const upazilaMap = getAllUpazila('en');
  const unionMap = getAllUnion('en');

  const [districtOptions, setDistrictOptions] = useState([]);
  const [unionOptions, setUnionOptions] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked, options } = e.target;
    if (name === 'division') {
      setDistrictOptions(districtMap[value] || []);
      setUnionOptions([]);
      const divText = options[options.selectedIndex]?.text || value;
      setForm((p) => ({ ...p, division: value, divisionName: divText, district: '', districtName: '', union: '' }));
    } else if (name === 'district') {
      const upazilasArr = upazilaMap[value] || [];
      const names = [];
      upazilasArr.forEach((u) => {
        names.push(u.title);
        const unionsArr = unionMap[u.value] || [];
        unionsArr.forEach((un) => names.push(un.title));
      });
      setUnionOptions(names);
      const text = options[options.selectedIndex]?.text || value;
      setForm((p) => ({ ...p, district: value, districtName: text, union: '' }));
    } else {
      setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uid) {
      setError('You must be logged in to save an address.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        label: form.label.trim() || 'Home',
        name: form.name.trim(),
        phone: form.phone.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        city: form.union || form.city || '',
        state: form.divisionName || form.state || '',
        district: form.districtName || '',
        uid,
        role: role || 'client',
        zip: form.zip.trim(),
        country: form.country.trim(),
        isDefault: form.isDefault,
      };

      if (!payload.name || !payload.phone || !payload.addressLine1 || !payload.city || !payload.state || !payload.district) {
        setError('Please complete all required fields.');
        setSaving(false);
        return;
      }

      await axios.post(`${apiBase}/api/addresses`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (onSaved) await onSaved();
    } catch (err) {
      console.error('Address save failed', err);
      setError(err.response?.data?.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  const backdropClick = (e) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8"
      onClick={backdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-primary-100/40 animate-[fadeIn_0.25s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 bg-gradient-to-r from-primary-50 to-primary-100 rounded-t-2xl">
          <h2 className="text-lg font-bold tracking-tight text-primary-700">Add New Address</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-rose-50 hover:text-rose-600 shadow-sm transition"
            aria-label="Close"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Label</label>
              <input name="label" value={form.label} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Full Name *</label>
              <input required name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Phone *</label>
              <input required name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">House / Flat / Road *</label>
              <input required name="addressLine1" value={form.addressLine1} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Area / Union</label>
              <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Division *</label>
              <select required name="division" value={form.division} onChange={handleChange} className="w-full appearance-none rounded-xl border-2 border-accent-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200">
                <option value="">Select division</option>
                {divisions.map(d => <option key={d.value} value={d.value}>{d.title}</option>)}
              </select>
            </div>
            {districtOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">District *</label>
                <select required name="district" value={form.district} onChange={handleChange} className="w-full appearance-none rounded-xl border-2 border-accent-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200">
                  <option value="">Select district</option>
                  {districtOptions.map(d => <option key={d.value} value={d.value}>{d.title}</option>)}
                </select>
              </div>
            )}
            {unionOptions.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Union / Area *</label>
                <select required name="union" value={form.union} onChange={handleChange} className="w-full appearance-none rounded-xl border-2 border-accent-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200">
                  <option value="">Select area</option>
                  {unionOptions.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">ZIP / Postcode</label>
              <input name="zip" value={form.zip} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-accent-600">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className="w-full rounded-xl border-2 border-accent-200 px-4 py-2.5 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-200" />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-2">
              <input id="isDefault" type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} className="h-5 w-5 rounded-md border-2 border-accent-300 text-primary-600 focus:ring-primary-400" />
              <label htmlFor="isDefault" className="text-sm font-medium text-accent-700">Set as default address</label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-accent-200/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-accent-200 px-6 py-3 text-sm font-semibold text-accent-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
          <p className="text-[10px] text-accent-400 text-center mt-2">Fields marked * are required</p>
        </form>
      </div>
    </div>
  );
};

export default AddAddressModal;
