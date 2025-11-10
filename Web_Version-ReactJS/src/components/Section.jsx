import React from 'react';

const Section = ({ 
  title, 
  children, 
  className = '', 
  subtitle = '',
  status = '',
  badge = null,
  actions = null,
  collapsible = false,
  defaultCollapsed = false 
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={`section ${className} ${collapsible ? 'collapsible' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="section-header">
        <div className="section-title-container">
          {collapsible && (
            <button 
              className="collapse-toggle"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <div className="section-title-content">
            <h2 className="section-title">{title}</h2>
            {subtitle && (
              <p className="section-subtitle">{subtitle}</p>
            )}
            {status && (
              <div className="section-status">
                {status}
              </div>
            )}
          </div>
        </div>
        
        <div className="section-header-actions">
          {badge && (
            <span className={`section-badge ${badge.type || 'default'}`}>
              {badge.text}
            </span>
          )}
          {actions && (
            <div className="section-actions">
              {actions}
            </div>
          )}
          {collapsible && (
            <button 
              className="collapse-toggle-large"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </button>
          )}
        </div>
      </div>

      <div className={`section-content ${isCollapsed ? 'hidden' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Section;