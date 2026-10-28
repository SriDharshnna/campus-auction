export default function StatusBadge({ status, label }) {
  const normalized = (status || '').toLowerCase();

  const getStatusConfig = () => {
    switch (normalized) {
      case 'active':
        return { className: 'badge-active', text: label || 'Live Auction' };
      case 'winning':
        return { className: 'badge-winning', text: label || 'Highest Bidder' };
      case 'outbid':
        return { className: 'badge-outbid', text: label || 'Outbid' };
      case 'won':
      case 'completed':
        return { className: 'badge-completed', text: label || 'Completed' };
      case 'pending_approval':
      case 'pending':
        return { className: 'badge-pending', text: label || 'Awaiting Approval' };
      case 'unsold':
        return { className: 'badge-unsold', text: label || 'Unsold' };
      default:
        return { className: 'badge-default', text: label || status };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`status-pill ${config.className}`}>
      {config.text}
    </span>
  );
}
