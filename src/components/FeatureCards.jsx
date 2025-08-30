import React from 'react';
import { FaUsers, FaHandshake, FaBoxes, FaShieldAlt } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../translations/translations';
// Keeping CSS import for custom properties like colors and fonts
import '../styles/FeatureCards.css';

const FeatureCards = () => {
  const { language } = useLanguage();
  const t = translations[language].featureCards;
  
  const features = [
    {
      icon: <FaUsers className="w-8 h-8 text-green-600" />,
      title: t.empoweringFarmers.title,
      description: t.empoweringFarmers.description,
      emoji: "🌾"
    },
    {
      icon: <FaHandshake className="w-8 h-8 text-blue-600" />,
      title: t.fairPricing.title,
      description: t.fairPricing.description,
      emoji: "📉"
    },
    {
      icon: <FaBoxes className="w-8 h-8 text-purple-600" />,
      title: t.bulkTrading.title,
      description: t.bulkTrading.description,
      emoji: "🚜"
    },
    {
      icon: <FaShieldAlt className="w-8 h-8 text-orange-600" />,
      title: t.secureTransactions.title,
      description: t.secureTransactions.description,
      emoji: "🔒"
    }
  ];

  return (
    <div className='bg-featured-color'>
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
                <div className="text-center">
                  <div className="flex justify-center items-center mb-4 relative">
                    <div className="p-4 bg-gray-50 rounded-full">
                      {feature.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 text-2xl">{feature.emoji}</span>
                  </div>
                  <div className="space-y-3">
                    <h3 className="secondary-font color-primary text-xl font-semibold">{feature.title}</h3>
                    <p className="br-hendrix color-primary text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeatureCards;
