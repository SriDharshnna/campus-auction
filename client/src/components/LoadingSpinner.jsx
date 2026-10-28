export default function LoadingSpinner({ text = 'Loading marketplace items...' }) {
  return (
    <div className="spinner-container">
      <div className="spinner-ring"></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
}
