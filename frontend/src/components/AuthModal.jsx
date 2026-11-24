import { useEffect, useState } from "react";
import { ArrowRight, Compass, Lock, Mail, User, X } from "lucide-react";
import { API_BASE } from "../lib/api";
import "./AuthModal.css";

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormData((value) => value.password ? { ...value, password: "" } : value);
      setError((value) => value ? "" : value);
      setSubmitted((value) => value ? false : value);
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/${isSignUp ? "signup" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const payload = await response.json();
      if (!response.ok) {
        const detail = payload.detail;
        throw new Error(typeof detail === "string" ? detail : detail?.[0]?.msg || "Could not authenticate. Please try again.");
      }

      onAuthSuccess(payload.user, payload.expires_at);
      setSubmitted(true);
      window.setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 650);
    } catch (requestError) {
      setError(requestError instanceof TypeError
        ? "Could not connect to the account service. Make sure the FastAPI server is running."
        : requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp((value) => !value);
    setError("");
    setFormData((value) => ({ ...value, password: "" }));
  };

  return (
    <div className="auth-backdrop animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close authentication dialog"><X size={18} /></button>
        <div className="auth-header">
          <div className="auth-logo"><Compass size={22} className="auth-compass" aria-hidden="true" /></div>
          <h2 id="auth-modal-title">{isSignUp ? "Create your account" : "Welcome back"}</h2>
          <p>{isSignUp ? "Create a WeekendEscapes account to get started." : "Sign in to your WeekendEscapes account."}</p>
        </div>

        {submitted ? (
          <div className="auth-success-box" role="status">
            <span className="success-badge">Success</span>
            <h3>{isSignUp ? "Account created" : "You’re signed in"}</h3>
            <p>Your session will expire after 30 minutes.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {isSignUp && <div className="auth-input-group">
              <label htmlFor="auth-name"><User size={15} aria-hidden="true" /> Full name</label>
              <input id="auth-name" type="text" autoComplete="name" placeholder="Enter your name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} minLength={1} maxLength={100} required />
            </div>}
            <div className="auth-input-group">
              <label htmlFor="auth-email"><Mail size={15} aria-hidden="true" /> Email address</label>
              <input id="auth-email" type="email" autoComplete="email" placeholder="name@example.com" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required />
            </div>
            <div className="auth-input-group">
              <label htmlFor="auth-password"><Lock size={15} aria-hidden="true" /> Password</label>
              <input id="auth-password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="At least 8 characters" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} minLength={isSignUp ? 8 : 1} maxLength={128} required />
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="btn-auth-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}</span>
              {!isSubmitting && <ArrowRight size={16} aria-hidden="true" />}
            </button>
            <div className="auth-toggle-row">
              <span>{isSignUp ? "Already have an account?" : "New to WeekendEscapes?"}</span>
              <button type="button" className="btn-auth-toggle" onClick={toggleMode}>{isSignUp ? "Sign in" : "Sign up"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
