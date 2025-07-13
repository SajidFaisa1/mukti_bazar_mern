import React from 'react';
import { Link } from 'react-router-dom';

// Simple settings hub – can be expanded with more options later
const Settings = () => {
  return (
    <div className="settings-page container">
      <h1>Settings</h1>
      <ul className="settings-list">
        <li>
          <Link to="/settings/address-book" className="settings-link">
            Address Book
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Settings;
