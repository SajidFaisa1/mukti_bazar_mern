import React from 'react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations/translations';
import './Footer.css';

const Footer = () => {
  const { language } = useLanguage();
  const t = translations[language] || {};
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-about">
          <h3 className="footer-title">{t.footer?.about || 'About Us'}</h3>
          <p>{t.footer?.aboutText || 'Mukti Bazar is your trusted online marketplace for authentic agro products delivered directly from farmers and vendors.'}</p>
        </div>

        <div className="footer-links">
          <h3 className="footer-title">{t.footer?.quickLinks || 'Quick Links'}</h3>
          <ul>
            <li><a href="/">{t.navbar?.home || 'Home'}</a></li>
            <li><a href="/categories">{t.navbar?.categories || 'Categories'}</a></li>
            <li><a href="/deals">{t.navbar?.deals || 'Deals'}</a></li>
            <li><a href="/cart">{t.navbar?.cart || 'Cart'}</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h3 className="footer-title">{t.footer?.contact || 'Contact'}</h3>
          <p>Email: support@muktibazar.com</p>
          <p>Phone: +880 1234 567 890</p>
          <div className="footer-social">
            <a href="https://facebook.com" aria-label="Facebook"><FaFacebookF /></a>
            <a href="https://twitter.com" aria-label="Twitter"><FaTwitter /></a>
            <a href="https://instagram.com" aria-label="Instagram"><FaInstagram /></a>
            <a href="https://linkedin.com" aria-label="LinkedIn"><FaLinkedin /></a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {year} Mukti Bazar. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
