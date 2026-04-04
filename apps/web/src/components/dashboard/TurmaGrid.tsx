import React from 'react';
import { TurmaCard } from './TurmaCard.js';

interface Turma {
  _id: string;
  name: string;
  year: number;
  periodo: string;
}

interface TurmaGridProps {
  turmas: Turma[];
  onSelect: (id: string, name: string) => void;
}

export const TurmaGrid: React.FC<TurmaGridProps> = ({ turmas, onSelect }) => {
  if (turmas.length === 0) {
    return (
      <div className="glass-panel flex-center" style={{ padding: '4rem', textAlign: 'center' }}>
        <p className="text-secondary">Nenhuma turma encontrada para exibição.</p>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1.5rem' 
      }}
    >
      {turmas.map((t) => (
        <TurmaCard 
          key={t._id}
          id={t._id}
          name={t.name}
          year={t.year}
          periodo={t.periodo}
          onClick={onSelect}
        />
      ))}
    </div>
  );
};
