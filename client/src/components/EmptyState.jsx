import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No items found',
  description = 'Try adjusting your filters or check back later for new campus listings.',
  actionLabel,
  onAction,
  icon: Icon = Inbox
}) {
  return (
    <div className="empty-state-box">
      <div className="empty-state-icon">
        <Icon size={36} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
