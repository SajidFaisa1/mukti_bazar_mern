import React, { useState, useEffect } from 'react';
import { Bell, Clock, Eye, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnnouncementWidget = ({ limit = 3, showViewAll = true }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentAnnouncements = async () => {
      try {
        const response = await fetch(`/api/communication/public/announcements?limit=${limit}&type=all`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements || []);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentAnnouncements();
  }, [limit]);

  const handleAnnouncementClick = async (announcement) => {
    try {
      // Track view
      await fetch(`/api/communication/public/announcements/${announcement.id}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const publishedDate = new Date(dateString);
    const diffInHours = Math.floor((now - publishedDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const getPriorityBadge = (priority, featured) => {
    if (featured) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200">
          ⭐ Featured
        </span>
      );
    }

    const badgeClasses = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const badgeLabels = {
      high: 'High Priority',
      medium: 'Medium',
      low: 'Info'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClasses[priority] || badgeClasses.low}`}>
        {badgeLabels[priority] || 'Info'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Latest Announcements</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!announcements.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Latest Announcements</h3>
        </div>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No announcements available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Latest Announcements</h3>
          </div>
          {showViewAll && (
            <button 
              onClick={() => navigate('/announcements')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 transition-colors"
            >
              <span>View All</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="divide-y divide-gray-100">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            onClick={() => handleAnnouncementClick(announcement)}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-1 min-w-0">
                {/* Title and badges */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {announcement.title}
                    {announcement.pinned && (
                      <span className="ml-2 text-blue-600">📌</span>
                    )}
                  </h4>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2 transition-colors" />
                </div>

                {/* Content preview */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {announcement.content}
                </p>

                {/* Priority badge */}
                <div className="mb-3">
                  {getPriorityBadge(announcement.priority, announcement.featured)}
                </div>

                {/* Meta information */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(announcement.publishedAt)}</span>
                    </div>
                    {announcement.views > 0 && (
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{announcement.views}</span>
                      </div>
                    )}
                  </div>
                  
                  {announcement.reactions && (announcement.reactions.likes > 0 || announcement.reactions.helpful > 0) && (
                    <div className="flex items-center space-x-2">
                      {announcement.reactions.likes > 0 && (
                        <span>👍 {announcement.reactions.likes}</span>
                      )}
                      {announcement.reactions.helpful > 0 && (
                        <span>💡 {announcement.reactions.helpful}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with action */}
      {showViewAll && announcements.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <button 
            onClick={() => navigate('/announcements')}
            className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All Announcements
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnouncementWidget;
