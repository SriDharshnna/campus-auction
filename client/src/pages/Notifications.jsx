import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ArrowRight, Flame, ShieldAlert, Award, Inbox, Handshake, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res?.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markSingleAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getNotifIcon = (type) => {
    switch (type) {
      case 'outbid':
        return <ShieldAlert className="notif-type-icon outbid" size={20} />;
      case 'closing_soon':
        return <Flame className="notif-type-icon closing" size={20} />;
      case 'approval_needed':
      case 'approval':
        return <Award className="notif-type-icon approval" size={20} />;
      case 'sale_approved':
      case 'auction_won':
        return <CheckCircle2 className="notif-type-icon approval" size={20} color="#10b981" />;
      case 'handover_confirmed':
        return <Handshake className="notif-type-icon approval" size={20} color="#6366f1" />;
      default:
        return <Bell className="notif-type-icon default" size={20} />;
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notif-header">
          <div className="notif-title-group">
            <div className="notif-icon-box">
              <Bell size={22} />
            </div>
            <div>
              <h1>Student Notifications</h1>
              <p>Real-time outbid warnings, closing alerts and campus handover messages</p>
            </div>
          </div>

          <div className="notif-actions">
            <button className="btn-mark-all" onClick={markAllAsRead}>
              <CheckCheck size={16} /> Mark all read
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="notif-tabs">
          <button
            className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        {/* List */}
        <div className="notif-list">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <LoadingSpinner size="md" message="Loading notifications..." />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`notif-card ${!item.read ? 'unread' : ''}`}
                onClick={() => markSingleAsRead(item.id)}
              >
                <div className="notif-card-left">
                  {getNotifIcon(item.type)}
                  <div className="notif-content">
                    <div className="notif-title-row">
                      <h4>{item.title}</h4>
                      <span className="notif-timestamp">{formatTimestamp(item.createdAt)}</span>
                    </div>
                    <p className="notif-desc">{item.message}</p>
                  </div>
                </div>

                <div className="notif-card-right">
                  <Link to="/dashboard" className="btn-notif-action">
                    View in My Dashboard <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="All caught up!"
              description="No notifications at the moment. We will notify you whenever an auction closes, bids are approved, or handover updates arrive."
              icon={Inbox}
            />
          )}
        </div>
      </div>
    </div>
  );
}
