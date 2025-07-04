import React from 'react';
import { FaUsers, FaHandshake, FaBoxes, FaShieldAlt } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations/translations';
import '../styles/FeatureCards.css';

const FeatureCards = () => {
  const { language } = useLanguage();
  const t = translations[language].featureCards;
  
  const features = [
    {
      icon: <FaUsers className="feature-icon" />,
      title: t.empoweringFarmers.title,
      description: t.empoweringFarmers.description,
      emoji: "🌾"
    },
    {
      icon: <FaHandshake className="feature-icon" />,
      title: t.fairPricing.title,
      description: t.fairPricing.description,
      emoji: "📉"
    },
    {
      icon: <FaBoxes className="feature-icon" />,
      title: t.bulkTrading.title,
      description: t.bulkTrading.description,
      emoji: "🚜"
    },
    {
      icon: <FaShieldAlt className="feature-icon" />,
      title: t.secureTransactions.title,
      description: t.secureTransactions.description,
      emoji: "🔒"
    }
  ];

  return (
    <div className='bg-featured-color'>
      <section className="features-section">
      <div className="features-container">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-content">
              <div className="feature-icon-container">
                {feature.icon}
                <span className="feature-emoji">{feature.emoji}</span>
              </div>
              <div className="feature-text">
                <h3 className="secondary-font color-primary">{feature.title}</h3>
                <p className="br-hendrix color-primary">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
    
  );
};

export default FeatureCards;
