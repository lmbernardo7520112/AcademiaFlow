import { Turma } from '@academiaflow/shared';
import { TurmaCard } from './TurmaCard.js';

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
      {turmas.map((t) => {
        const tId = t.id || t._id || '';
        return (
          <TurmaCard 
            key={tId}
            id={tId}
            name={t.name}
            year={t.year}
            periodo={t.periodo}
            onClick={onSelect}
          />
        );
      })}
    </div>
  );
};
