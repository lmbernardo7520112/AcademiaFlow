import React from 'react';
import '../../styles/design-tokens.css';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  highlight?: boolean;
}

export default function GlassCard({ children, title, className = '', highlight = false }: GlassCardProps) {
  const cardClass = `glass-panel ${highlight ? 'highlight' : ''} ${className}`;
  
  return (
    <div className={cardClass}>
      {title && <h3 className="stat-card-title">{title}</h3>}
      {children}
    </div>
  );
}
