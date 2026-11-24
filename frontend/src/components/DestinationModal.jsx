import { useEffect } from "react";
import { X, MapPin, Clock, Mountain, CheckCircle2, Compass } from "lucide-react";
import "./DestinationModal.css";
import { destinationImages, fallbackDestinationImage } from "../data/destinationImages";

function DestinationModal({ destination, onClose, onPlanTrip }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!destination) return null;

  const imgUrl = destinationImages[destination.name] || fallbackDestinationImage;

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dest-title"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="modal-image-header">
          <img
            src={imgUrl}
            alt={`High resolution view of ${destination.name}`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackDestinationImage;
            }}
          />
          <div className="modal-image-overlay">
            <span className="modal-rating-badge">⭐ {destination.rating} / 5.0</span>
            <h2 id="modal-dest-title">{destination.name}</h2>
            <p><MapPin size={14} aria-hidden="true" /> {destination.state}, India</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div className="modal-meta-grid">
            <div className="meta-box">
              <Clock className="meta-icon" size={18} aria-hidden="true" />
              <div>
                <span className="meta-label">Est. Travel Duration</span>
                <span className="meta-value">{destination.travel_hours} Hours</span>
              </div>
            </div>

            <div className="meta-box">
              <Mountain className="meta-icon" size={18} aria-hidden="true" />
              <div>
                <span className="meta-label">Coordinates</span>
                <span className="meta-value">{destination.latitude.toFixed(2)}° N, {destination.longitude.toFixed(2)}° E</span>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3>Overview</h3>
            <p className="modal-description">
              {destination.description || `${destination.name} is one of the premier weekend travel destinations in ${destination.state}, offering stunning natural vistas, serene outdoor environments, and rich cultural experiences.`}
            </p>
          </div>

          <div className="modal-section">
            <h3>Popular Activities</h3>
            <div className="modal-activities-list">
              {destination.activities.map((act) => (
                <div key={act} className="activity-item">
                  <CheckCircle2 size={16} className="check-icon" aria-hidden="true" />
                  <span>{act.charAt(0).toUpperCase() + act.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={onClose}>
              Close
            </button>
            <button
              className="btn-modal-plan"
              onClick={() => {
                onClose();
                onPlanTrip(destination);
              }}
            >
              <Compass size={17} aria-hidden="true" />
              <span>Plan Trip to {destination.name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DestinationModal;
