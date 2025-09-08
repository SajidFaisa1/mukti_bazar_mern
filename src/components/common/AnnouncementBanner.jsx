import React, { useState, useEffect } from 'react';
import { X, Bell, AlertTriangle, Info, CheckCircle, Star, ChevronUp, ChevronDown } from 'lucide-react';

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopAnnouncements = async () => {
      try {
        const response = await fetch('/api/communication/public/announcements?type=all&limit=3');
        if (response.ok) {
          const data = await response.json();
          const topAnnouncements = data.announcements.filter(ann => 
            ann.priority === 'high' || ann.featured || ann.pinned
          );
          
          // Check dismissed announcements
          const dismissedIds = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
          const activeAnnouncements = topAnnouncements.filter(ann => 
            !dismissedIds.includes(ann.id)
          );
          
          setAnnouncements(activeAnnouncements);
        }
      } catch (error) {
        console.error('Error fetching top announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length > 1 && !isMinimized) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [announcements.length, isMinimized]);

  const handleDismiss = () => {
    if (announcements[currentIndex]) {
      const dismissedIds = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
      dismissedIds.push(announcements[currentIndex].id);
      localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedIds));
      
      // Remove from current announcements
      const remainingAnnouncements = announcements.filter((_, index) => index !== currentIndex);
      setAnnouncements(remainingAnnouncements);
      
      if (remainingAnnouncements.length === 0) {
        setIsVisible(false);
      } else if (currentIndex >= remainingAnnouncements.length) {
        setCurrentIndex(0);
      }
    }
  };

  const getPriorityIcon = (priority, featured) => {
    if (featured) return <Star className="w-4 h-4 fill-current" />;
    
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Bell className="w-4 h-4" />;
      case 'low':
        return <Info className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColors = (priority, featured, pinned) => {
    if (featured) {
      return 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white border-purple-500';
    }
    if (pinned) {
      return 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white border-blue-500';
    }
    
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white border-red-500';
      case 'medium':
        return 'bg-gradient-to-r from-amber-500 via-orange-600 to-red-500 text-white border-amber-500';
      case 'low':
        return 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-blue-500';
      default:
        return 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 text-white border-gray-600';
    }
  };

  if (loading || !announcements.length || !isVisible) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className={`${getPriorityColors(currentAnnouncement.priority, currentAnnouncement.featured, currentAnnouncement.pinned)} 
                     shadow-lg relative overflow-hidden transition-all duration-300 ease-in-out
                     ${isMinimized ? 'h-12' : 'min-h-16'} border-b-2`}>
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-10">
        <div className="absolute inset-0 opacity-20" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             }} />
      </div>

      <div className="relative px-4 py-3 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Icon with animation */}
          <div className="flex-shrink-0 animate-pulse">
            {getPriorityIcon(currentAnnouncement.priority, currentAnnouncement.featured)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {!isMinimized ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm lg:text-base">
                    {currentAnnouncement.title}
                  </span>
                  {currentAnnouncement.pinned && (
                    <span className="bg-white bg-opacity-20 text-xs px-2 py-0.5 rounded-full font-medium">
                      📌 Pinned
                    </span>
                  )}
                  {currentAnnouncement.featured && (
                    <span className="bg-yellow-400 bg-opacity-90 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">
                      ⭐ Featured
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-90 line-clamp-2">
                  {currentAnnouncement.content}
                </p>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm truncate">
                  {currentAnnouncement.title}
                </span>
                {announcements.length > 1 && (
                  <span className="text-xs opacity-75">
                    ({currentIndex + 1}/{announcements.length})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Navigation dots for multiple announcements */}
          {announcements.length > 1 && !isMinimized && (
            <div className="hidden sm:flex items-center space-x-1">
              {announcements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-white scale-110' 
                      : 'bg-white bg-opacity-50 hover:bg-opacity-75 hover:scale-105'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1 ml-3">
          {/* Minimize/Expand button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200 group"
            aria-label={isMinimized ? 'Expand announcement' : 'Minimize announcement'}
          >
            {isMinimized ? (
              <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200 group"
            aria-label="Dismiss announcement"
          >
            <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Progress bar for auto-rotation */}
      {announcements.length > 1 && !isMinimized && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white bg-opacity-20">
          <div 
            className="h-full bg-white transition-all duration-100 ease-linear rounded-r-full"
            style={{
              width: `${((currentIndex + 1) / announcements.length) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AnnouncementBanner;
