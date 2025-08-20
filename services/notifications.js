const { supabase } = require('../config/supabase');

class NotificationService {
  constructor() {
    this.subscriptions = new Map();
  }

  subscribeToSwapMatches(userId, callback) {
    const channelName = `swap_matches_${userId}`;
    
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName).unsubscribe();
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'swap_matches',
          filter: `student_a_id=eq.${userId},student_b_id=eq.${userId}`
        },
        (payload) => {
          callback({
            type: 'new_match',
            data: payload.new,
            message: 'You have a new swap match!'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swap_matches',
          filter: `student_a_id=eq.${userId},student_b_id=eq.${userId}`
        },
        (payload) => {
          const { match_status } = payload.new;
          let message = '';
          
          switch (match_status) {
            case 'accepted':
              message = 'Your swap match has been accepted!';
              break;
            case 'rejected':
              message = 'Your swap match has been rejected.';
              break;
            case 'completed':
              message = 'Your course swap has been completed successfully!';
              break;
            default:
              message = 'Your swap match status has been updated.';
          }
          
          callback({
            type: 'match_update',
            data: payload.new,
            message
          });
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    return channelName;
  }

  subscribeToSwapRequests(userId, callback) {
    const channelName = `swap_requests_${userId}`;
    
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName).unsubscribe();
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swap_requests',
          filter: `requester_id=eq.${userId}`
        },
        (payload) => {
          const { status } = payload.new;
          let message = '';
          
          switch (status) {
            case 'matched':
              message = 'Your swap request has been matched with another student!';
              break;
            case 'completed':
              message = 'Your swap request has been completed!';
              break;
            case 'expired':
              message = 'Your swap request has expired.';
              break;
            default:
              message = 'Your swap request status has been updated.';
          }
          
          callback({
            type: 'request_update',
            data: payload.new,
            message
          });
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    return channelName;
  }

  subscribeToNewSwapOpportunities(userId, enrolledCourseIds, callback) {
    if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
      return null;
    }

    const channelName = `swap_opportunities_${userId}`;
    
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName).unsubscribe();
    }

    const courseFilter = enrolledCourseIds.map(id => `desired_course_id=eq.${id}`).join(',');

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'swap_requests',
          filter: courseFilter
        },
        (payload) => {
          if (payload.new.requester_id !== userId) {
            callback({
              type: 'new_opportunity',
              data: payload.new,
              message: 'A new swap opportunity is available for one of your courses!'
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    return channelName;
  }

  subscribeToMarketplace(callback, filters = {}) {
    const channelName = 'marketplace_updates';
    
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName).unsubscribe();
    }

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'swap_requests'
        },
        (payload) => {
          callback({
            type: 'new_request',
            data: payload.new,
            message: 'A new swap request has been posted to the marketplace!'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swap_requests'
        },
        (payload) => {
          if (payload.new.status === 'cancelled' || payload.new.status === 'completed') {
            callback({
              type: 'request_removed',
              data: payload.new,
              message: 'A swap request has been removed from the marketplace.'
            });
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, subscription);
    return channelName;
  }

  unsubscribe(channelName) {
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName).unsubscribe();
      this.subscriptions.delete(channelName);
      return true;
    }
    return false;
  }

  unsubscribeAll() {
    for (const [channelName, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
  }

  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

const createNotificationEndpoints = (app, notificationService) => {
  app.get('/api/notifications/subscribe/:type', (req, res) => {
    const { type } = req.params;
    const { userId, courseIds } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let channelName;

    switch (type) {
      case 'matches':
        channelName = notificationService.subscribeToSwapMatches(userId, sendEvent);
        break;
      case 'requests':
        channelName = notificationService.subscribeToSwapRequests(userId, sendEvent);
        break;
      case 'opportunities':
        if (courseIds) {
          const courseIdArray = courseIds.split(',');
          channelName = notificationService.subscribeToNewSwapOpportunities(userId, courseIdArray, sendEvent);
        }
        break;
      case 'marketplace':
        channelName = notificationService.subscribeToMarketplace(sendEvent);
        break;
      default:
        res.status(400).json({ error: 'Invalid subscription type' });
        return;
    }

    sendEvent({ type: 'connected', message: 'Successfully connected to notifications' });

    req.on('close', () => {
      if (channelName) {
        notificationService.unsubscribe(channelName);
      }
    });
  });

  app.post('/api/notifications/unsubscribe/:channelName', (req, res) => {
    const { channelName } = req.params;
    const success = notificationService.unsubscribe(channelName);
    
    res.json({ 
      success,
      message: success ? 'Unsubscribed successfully' : 'Channel not found'
    });
  });

  app.get('/api/notifications/active', (req, res) => {
    const activeSubscriptions = notificationService.getActiveSubscriptions();
    res.json({ subscriptions: activeSubscriptions });
  });
};

const notificationService = new NotificationService();

module.exports = {
  NotificationService,
  notificationService,
  createNotificationEndpoints
};