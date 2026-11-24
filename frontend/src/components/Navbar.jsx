import { useState } from "react";
import { Compass, MapPin, Calendar, Heart, User, Menu, X, Sparkles, LogOut } from "lucide-react";
import "./Navbar.css";

function Navbar({ activeTab, setActiveTab, onOpenAuth, user, onSignOut }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home", icon: Compass },
    { id: "explore", label: "Explore", icon: MapPin },
    { id: "planner", label: "Trip Planner", icon: Calendar },
    { id: "saved", label: "My Trips", icon: Heart },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="navbar-container" role="banner">
      <div className="navbar-inner">
        
        {/* Brand Logo */}
        <button
          className="navbar-brand"
          onClick={() => handleNavClick("home")}
          aria-label="WeekendEscapes Home"
        >
          <div className="logo-icon-wrapper">
            <Compass className="logo-icon" size={22} aria-hidden="true" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Weekend<span className="text-accent">Escapes</span></span>
            <span className="brand-subtitle">Smart Trip Planner</span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="navbar-links" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="nav-icon" size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="navbar-actions">
          <button 
            className="btn-plan-now"
            onClick={() => handleNavClick("planner")}
            aria-label="Start Planning a Trip"
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Plan Trip</span>
          </button>

          <button
            className="btn-user-auth"
            onClick={user ? onSignOut : onOpenAuth}
            aria-label={user ? `Sign out ${user.name}` : "Sign in"}
            title={user ? `Signed in as ${user.email}` : undefined}
          >
            {user ? <LogOut size={16} aria-hidden="true" /> : <User size={17} aria-hidden="true" />}
            <span className="auth-label">{user ? "Sign out" : "Sign in"}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="btn-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <nav className="mobile-drawer animate-fade-in" aria-label="Mobile Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`mobile-nav-link ${isActive ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="mobile-drawer-divider" />

          <button
            className="mobile-auth-btn"
            onClick={() => {
              if (user) onSignOut();
              else onOpenAuth();
              setMobileMenuOpen(false);
            }}
          >
            {user ? <LogOut size={18} aria-hidden="true" /> : <User size={18} aria-hidden="true" />}
            <span>{user ? "Sign out" : "Sign in / Register"}</span>
          </button>
        </nav>
      )}
    </header>
  );
}

export default Navbar;
