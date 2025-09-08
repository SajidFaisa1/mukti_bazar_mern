import React, { useState, useEffect } from 'react';
import { 
  Bell, Clock, Eye, ThumbsUp, Lightbulb, ThumbsDown, 
  Pin, Star, Filter, RefreshCw, ChevronDown, User,
  Calendar, AlertCircle, Info, Wrench, Sparkles, 
  PartyPopper, AlertTriangle
} from 'lucide-react';

const AnnouncementsFeed = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reactionLoading, setReactionLoading] = useState({});

  const announcementTypes = [
    { value: 'all', label: 'All Announcements', icon: Bell },
    { value: 'general', label: 'General', icon: Info },
    { value: 'maintenance', label: 'Maintenance', icon: Wrench },
    { value: 'feature', label: 'New Features', icon: Sparkles },
    { value: 'promotion', label: 'Promotions', icon: PartyPopper },
    { value: 'important', label: 'Important', icon: AlertTriangle },
    { value: 'event', label: 'Events', icon: Calendar }
  ];

  useEffect(() => {
    fetchAnnouncements(true);
  }, [filter]);

  const fetchAnnouncements = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await fetch(
        `/api/communication/public/announcements?type=${filter}&page=${currentPage}&limit=10`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }

      const data = await response.json();
      
      if (reset) {
        setAnnouncements(data.announcements || []);
        setPage(2);
      } else {
        setAnnouncements(prev => [...prev, ...(data.announcements || [])]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(data.pagination?.page < data.pagination?.totalPages);
      setError(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (announcementId, reactionType) => {
    setReactionLoading(prev => ({ ...prev, [announcementId]: true }));
    
    try {
      const response = await fetch(`/api/communication/public/announcements/${announcementId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactionType }),
      });

      if (response.ok) {
        const data = await response.json();
        
        setAnnouncements(prev => 
          prev.map(announcement => 
            announcement.id === announcementId 
              ? { ...announcement, reactions: data.reactions }
              : announcement
          )
        );
      }
    } catch (err) {
      console.error('Error adding reaction:', err);
    } finally {
      setReactionLoading(prev => ({ ...prev, [announcementId]: false }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColors = (priority, featured) => {
    if (featured) {
      return {
        border: 'border-l-purple-500',
        bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
        badge: 'bg-purple-100 text-purple-800 border-purple-200'
      };
    }

    switch (priority) {
      case 'high':
        return {
          border: 'border-l-red-500',
          bg: 'bg-gradient-to-r from-red-50 to-orange-50',
          badge: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'medium':
        return {
          border: 'border-l-yellow-500',
          bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      default:
        return {
          border: 'border-l-blue-500',
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          badge: 'bg-blue-100 text-blue-800 border-blue-200'
        };
    }
  };

  const getTypeIcon = (type) => {
    const typeObj = announcementTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : Bell;
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Bell className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h2>
          <p className="text-gray-600">Stay updated with the latest news and updates</p>
        </div>
        
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && announcements.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Announcements</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => fetchAnnouncements(true)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Bell className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h2>
        <p className="text-gray-600">Stay updated with the latest news and updates</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by type:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {announcementTypes.map(type => {
            const IconComponent = type.icon;
            return (
              <button
                key={type.value}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filter === type.value
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:scale-105'
                }`}
                onClick={() => setFilter(type.value)}
              >
                <IconComponent className="w-4 h-4 mr-2" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-6">
        {announcements.map((announcement) => {
          const colors = getPriorityColors(announcement.priority, announcement.featured);
          const IconComponent = getTypeIcon(announcement.type);
          
          return (
            <div 
              key={announcement.id} 
              className={`bg-white rounded-xl shadow-lg border-l-4 ${colors.border} ${colors.bg} overflow-hidden hover:shadow-xl transition-shadow duration-300`}
            >
              {/* Special badges */}
              {(announcement.pinned || announcement.featured) && (
                <div className="flex space-x-2 p-4 pb-0">
                  {announcement.pinned && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <Pin className="w-3 h-3 mr-1" />
                      Pinned
                    </span>
                  )}
                  {announcement.featured && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </span>
                  )}
                </div>
              )}

              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <IconComponent className="w-4 h-4" />
                      <span className="capitalize font-medium">{announcement.type}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(announcement.publishedAt)}</span>
                    </div>
                  </div>
                  
                  {announcement.priority !== 'low' && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors.badge}`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                  {announcement.title}
                </h3>
                
                {/* Content */}
                <div className="prose prose-sm max-w-none text-gray-700 mb-6">
                  <p>{announcement.content}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{announcement.views || 0} views</span>
                    </div>
                    
                    {announcement.createdBy && (
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>By {announcement.createdBy}</span>
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  <div className="flex items-center space-x-2">
                    <button 
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      onClick={() => handleReaction(announcement.id, 'likes')}
                      disabled={reactionLoading[announcement.id]}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {announcement.reactions?.likes || 0}
                    </button>
                    
                    <button 
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      onClick={() => handleReaction(announcement.id, 'helpful')}
                      disabled={reactionLoading[announcement.id]}
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      {announcement.reactions?.helpful || 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-8">
          <button 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fetchAnnouncements(false)}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load More Announcements
              </>
            )}
          </button>
        </div>
      )}

      {/* No announcements */}
      {announcements.length === 0 && !loading && (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Announcements Found</h3>
          <p className="text-gray-600 mb-6">There are currently no announcements to display.</p>
          {filter !== 'all' && (
            <button 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={() => setFilter('all')}
            >
              View All Announcements
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsFeed;
