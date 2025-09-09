import React from 'react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedin, FaPhone, FaEnvelope, FaMapMarkerAlt, FaLeaf } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations/translations';

const Footer = () => {
  const { language } = useLanguage();
  const t = translations[language] || {};
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Brand & About Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                  <FaLeaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                    Mukti Bazar
                  </h3>
                  <p className="text-sm text-gray-300">কৃষকের জয়, দেশের গৌরব</p>
                </div>
              </div>
              
              <p className="text-gray-300 leading-relaxed max-w-md">
                {t.footer?.aboutText || 'Mukti Bazar is your trusted online marketplace for authentic agro products delivered directly from farmers and vendors. Breaking syndicate barriers for fair trade.'}
              </p>

              {/* Newsletter Signup */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold mb-3 text-green-300">Stay Updated</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                  <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-green-300 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                {t.footer?.quickLinks || 'Quick Links'}
              </h3>
              <ul className="space-y-3">
                {[
                  { href: "/", label: t.navbar?.home || 'Home' },
                  { href: "/plant-diagnosis", label: "Plant Doctor" },
                  { href: "/deals", label: t.navbar?.deals || 'Deals' },
                  { href: "/stores", label: "Stores" },
                  { href: "/analysis", label: t.navbar?.analysis || 'Analysis' },
                  { href: "/about", label: "About Us" },
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" }
                ].map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-gray-300 hover:text-green-300 transition-colors duration-200 flex items-center group"
                    >
                      <span className="w-0 group-hover:w-2 h-0.5 bg-green-400 transition-all duration-200 mr-0 group-hover:mr-2 rounded-full"></span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-green-300 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></span>
                {t.footer?.contact || 'Get in Touch'}
              </h3>
              
              <div className="space-y-4">
                {/* Developer Contact */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <h4 className="font-semibold text-green-300 mb-3">Developer & Founder</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <FaPhone className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Faisal Tajwar</p>
                        <a href="tel:+8801794874195" className="text-sm text-gray-300 hover:text-green-300 transition-colors">
                          +880 1794 874 195
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <FaEnvelope className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <a href="mailto:support@muktibazar.com" className="text-sm text-gray-300 hover:text-green-300 transition-colors">
                          support@muktibazar.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <FaMapMarkerAlt className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-300">Dhaka, Bangladesh</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h4 className="font-semibold text-green-300 mb-3">Follow Us</h4>
                  <div className="flex space-x-3">
                    {[
                      { icon: FaFacebookF, href: "https://facebook.com", label: "Facebook", color: "hover:bg-blue-600" },
                      { icon: FaTwitter, href: "https://twitter.com", label: "Twitter", color: "hover:bg-blue-400" },
                      { icon: FaInstagram, href: "https://instagram.com", label: "Instagram", color: "hover:bg-pink-600" },
                      { icon: FaLinkedin, href: "https://linkedin.com", label: "LinkedIn", color: "hover:bg-blue-700" }
                    ].map((social, index) => (
                      <a
                        key={index}
                        href={social.href}
                        aria-label={social.label}
                        className={`w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200 hover:scale-110 hover:shadow-lg border border-white/10 ${social.color}`}
                      >
                        <social.icon className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <p className="text-gray-400 text-sm">
                  © {year} Mukti Bazar. All rights reserved.
                </p>
                <div className="hidden md:flex items-center space-x-2 text-xs text-gray-500">
                  <span>Made with</span>
                  <span className="text-red-400 animate-pulse">❤️</span>
                  <span>for farmers</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <a href="/privacy" className="hover:text-green-300 transition-colors">Privacy</a>
                <span>•</span>
                <a href="/terms" className="hover:text-green-300 transition-colors">Terms</a>
                <span>•</span>
                <a href="/support" className="hover:text-green-300 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
