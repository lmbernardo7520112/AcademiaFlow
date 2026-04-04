import React from 'react';
import { Users, Calendar, Clock } from 'lucide-react';

interface TurmaCardProps {
  id: string;
  name: string;
  year: number;
  periodo: string;
  onClick: (id: string, name: string) => void;
}

export const TurmaCard: React.FC<TurmaCardProps> = ({ id, name, year, periodo, onClick }) => {
  return (
    <div 
      className="glass-panel hover-card cursor-pointer" 
      style={{ 
        padding: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem',
        transition: 'all 0.3s ease'
      }}
      onClick={() => onClick(id, name)}
    >
      <div className="flex-center" style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '10px', 
        background: 'rgba(59, 130, 246, 0.1)',
        color: '#3b82f6',
        marginBottom: '0.5rem'
      }}>
        <Users size={20} />
      </div>
      
      <div>
        <h3 className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
          {name}
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Gestão de Discentes
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <Calendar size={12} />
          <span>{year}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <Clock size={12} />
          <span style={{ textTransform: 'capitalize' }}>{periodo}</span>
        </div>
      </div>
    </div>
  );
};
