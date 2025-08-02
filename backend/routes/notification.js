const express = require('express');
const Notification = require('../models/Notification');
const router = express.Router();

// GET /api/notifications - Get notifications for a user
router.get('/', async (req, res) => {
  try {
    const { uid, limit = 20, offset = 0, unreadOnly = false } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    let query = { recipientUid: uid };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const unreadCount = await Notification.countDocuments({ 
      recipientUid: uid, 
      read: false 
    });

    res.json({ 
      notifications,
      unreadCount,
      hasMore: notifications.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientUid: uid },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ 
      message: 'Notification marked as read',
      notification 
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const result = await Notification.updateMany(
      { recipientUid: uid, read: false },
      { read: true }
    );

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientUid: uid
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// DELETE /api/notifications/clear-all - Clear all notifications
router.delete('/clear-all', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const result = await Notification.deleteMany({ recipientUid: uid });

    res.json({ 
      message: 'All notifications cleared',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const stats = await Notification.aggregate([
      { $match: { recipientUid: uid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
          byType: {
            $push: {
              type: '$type',
              read: '$read'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          unread: 1,
          typeStats: {
            $reduce: {
              input: '$byType',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $arrayToObject: [
                      [{
                        k: '$$this.type',
                        v: {
                          $add: [
                            { $ifNull: [{ $getField: { field: '$$this.type', input: '$$value' } }, 0] },
                            1
                          ]
                        }
                      }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || { total: 0, unread: 0, typeStats: {} };

    res.json(result);

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
});

module.exports = router;
