import React from 'react';

const Section = ({ title, children, className = '' }) => {
  return (
    <div className={`section ${className}`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
};

export default Section;