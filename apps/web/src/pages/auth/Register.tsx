import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/auth.css';
import { api } from '../../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role: 'admin' });
      if (data.success) {
        navigate('/auth/login', { replace: true });
      }
    } catch (error: unknown) {
       console.error(error);
       const errorMessage = error instanceof Error ? error.message : 'Falha ao processar o registro da fundação educacional.';
       setErrorMsg(errorMessage);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      
      {/* Esquerda: Marketing B2B & Filosofia Invertida para o Register */}
      <div className="auth-info-panel" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(168, 85, 247, 0.1) 0%, transparent 60%)' }}>
        <div className="auth-brand" onClick={() => navigate('/')}>
          <div className="flow-dot"></div>
          <h2>AcademiaFlow</h2>
        </div>

        <div className="auth-pitch">
          <h1>
            Erga as Portas da Sua <span className="text-gradient-cyan">Escola Conectada</span>.
          </h1>
          <p>
            No instante em que confirmar, o nosso arquiteto Node.js isolará automaticamente um novo ambiente B2B para você. Todo professor ou secretária que você cadastrar lá dentro nascerá magicamente na sua Base de Dados Hermética.
          </p>
        </div>

        <div className="auth-quote" style={{ borderLeftColor: '#a855f7' }}>
          "O Multi-Tenant não é apenas um recurso.<br/>É a alma da proteção dos alunos B2B."
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-box">
          <h2>Seja o Fundador</h2>
          <p>Você será categorizado como <strong className="text-gradient-cyan">Usuário Administrador (Admin)</strong> vitalício da sua rede.</p>

          {errorMsg && (
            <div style={{ background: 'rgba(255,50,50,0.1)', color: 'hsl(345, 80%, 55%)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid rgba(255,50,50,0.2)' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="name">Seu Nome / Razão Social</label>
              <input 
                type="text" 
                id="name" 
                className="input-glass" 
                placeholder="Diretoria Tech School"
                value={name}
                onChange={e => setName(e.target.value)}
                required 
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">Email Root Executivo</label>
              <input 
                type="email" 
                id="email" 
                className="input-glass" 
                placeholder="admin@escola.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="password">Chave Root (Senha)</label>
              <input 
                type="password" 
                id="password" 
                className="input-glass" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
                minLength={6}
              />
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn-neon" disabled={loading} style={{ background: 'linear-gradient(135deg, hsl(190, 100%, 50%), #a855f7)', color: 'white' }}>
                {loading ? 'Engenharia B2B Operando...' : 'Fundar Minha Escola (Tenant)'}
              </button>
            </div>
          </form>

          <div className="auth-footer">
            A sua instituição educacional já possui convênio? <br/>
            <Link to="/auth/login" className="auth-link">Voltar para o Portão Central (Login)</Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
