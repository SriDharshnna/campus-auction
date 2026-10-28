import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownBadge({ closingAt, showIcon = true, size = 'normal', onExpire }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    if (!closingAt) return { closed: true, text: 'Ended' };
    const diff = new Date(closingAt).getTime() - Date.now();
    if (diff <= 0) return { closed: true, text: 'Ended' };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { closed: false, text: `${days}d ${hours % 24}h left`, urgent: false };
    }

    if (hours > 0) {
      return { closed: false, text: `${hours}h ${minutes}m left`, urgent: false };
    }

    const urgent = minutes < 10;
    const isSnipingZone = minutes === 0 && seconds <= 30;
    return {
      closed: false,
      text: `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s left`,
      urgent,
      isSnipingZone
    };
  }

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      const next = calculateTimeLeft();
      setTimeLeft(next);
      if (next.closed && onExpire) {
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [closingAt]);

  if (timeLeft.closed) {
    return (
      <span className={`countdown-badge closed size-${size}`}>
        {showIcon && <Clock size={12} />} Closed
      </span>
    );
  }

  return (
    <span className={`countdown-badge ${timeLeft.urgent ? 'urgent' : ''} size-${size}`}>
      {showIcon && <Clock size={12} />} {timeLeft.text}
    </span>
  );
}
