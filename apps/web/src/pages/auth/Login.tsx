import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/auth.css';
import { useAuth } from '../../contexts/AuthContext';

import { api } from '../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      // O backend retorna: { success: true, data: { user: {...}, token: '...' } }
      if (data.success && data.data) {
        login(data.data.user, data.data.token);
        navigate('/dashboard');
      }
    } catch (error: any) {
       console.error(error);
       setErrorMsg(error.response?.data?.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      
      {/* Esquerda: Marketing B2B & Filosofia */}
      <div className="auth-info-panel">
        <div className="auth-brand" onClick={() => navigate('/')}>
          <div className="flow-dot"></div>
          <h2>AcademiaFlow</h2>
        </div>

        <div className="auth-pitch">
          <h1>
            Governança <span className="text-gradient-cyan">Isolada e Segura</span>.
          </h1>
          <p>
            O acesso a AcademiaFlow é restrito e criptograficamente contido no seu ambiente 
            escolar. Nossos modelos de Inteligência Artificial rodam em zonas isoladas (`TenantId`)
            garantindo que o boletim dos seus alunos jamais cruze dados com outros colégios.
          </p>
        </div>

        <div className="auth-quote">
          "A infraestrutura de Dados que o Século XXI exige.<br/>A Simplicidade que a Secretaria aprova."
        </div>
      </div>

      {/* Direita: Cofre Form */}
      <div className="auth-form-panel">
        <div className="auth-box">
          <h2>Bem-vindo de Volta</h2>
          <p>Acesse o laboratório pedagógico de Inteligência Artificial.</p>

          {errorMsg && (
            <div style={{ background: 'rgba(255,50,50,0.1)', color: 'hsl(345, 80%, 55%)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid rgba(255,50,50,0.2)' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email Corporativo</label>
              <input 
                type="email" 
                id="email" 
                className="input-glass" 
                placeholder="diretoria@campussilicio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="password">Chave Criptográfica</label>
              <input 
                type="password" 
                id="password" 
                className="input-glass" 
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
              />
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn-neon" disabled={loading}>
                {loading ? 'Estabelecendo Handshake...' : 'Acessar a Plataforma'}
              </button>
            </div>
          </form>

          <div className="auth-footer">
            A fundação não possui uma chave C-Level? <br/>
            <Link to="/auth/register" className="auth-link">Registrar Nova Instituição Escolar</Link>
          </div>
        </div>
      </div>
      
    </div>
  );
}
