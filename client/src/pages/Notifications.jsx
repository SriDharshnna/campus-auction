import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ArrowRight, Flame, ShieldAlert, Award, Inbox } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../mock/mockData';
import EmptyState from '../components/EmptyState';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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
      case 'approval':
        return <Award className="notif-type-icon approval" size={20} />;
      default:
        return <Bell className="notif-type-icon default" size={20} />;
    }
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
          {filtered.length > 0 ? (
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
                      <span className="notif-timestamp">{item.timestamp}</span>
                    </div>
                    <p className="notif-desc">{item.message}</p>
                  </div>
                </div>

                <div className="notif-card-right">
                  <Link to={item.link} className="btn-notif-action">
                    View <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="All caught up!"
              description="No unread notifications at the moment. We will notify you whenever you are outbid or an auction is closing."
              icon={Inbox}
            />
          )}
        </div>
      </div>
    </div>
  );
}
