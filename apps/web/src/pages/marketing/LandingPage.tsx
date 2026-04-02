import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Reveal Hero
    setIsVisible(true);

    // Advanced Scroll Storytelling Interception
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className={`landing-wrapper ${isVisible ? 'fade-in' : 'opacity-0'}`}>
      
      {/* 1. HEADER ESTRATIFICADO - Isolando Logo vs Ações (Fix: Spacing Issue) */}
      <header className="landing-header">
        <div className="header-container">
            <div className="logo-area">
            <div className="flow-dot"></div>
            <h2>AcademiaFlow</h2>
            </div>
            <nav className="nav-actions">
            <button className="btn-glass" onClick={() => navigate('/auth/login')}>
                Acessar Painel
            </button>
            <button className="btn-neon" onClick={() => navigate('/auth/register')}>
                Teste como Diretor
            </button>
            </nav>
        </div>
      </header>

      {/* ======================================= */}
      {/* SECTION 1: THE HERO (PRIMEIRO IMPACTO)  */}
      {/* ======================================= */}
      <main className="hero-section hero-container reveal-on-scroll">
        <div className="hero-content">
          <div className="badge-ai">
            <span className="sparkle">✨</span> Sistema Multi-Tenant Impulsionado por IA
          </div>
          <h1 className="hero-title">
            O Próximo Salto do Ensino.<br/>
            Sua <span className="text-gradient-cyan">Escola Raciocinante</span>.
          </h1>
          <p className="hero-subtitle">
            A primeira plataforma educacional B2B que ingere o boletim do aluno, e através de modelos
            avançados do GenAI, te entrega instantaneamente planos de ação pedagógica hiper-personalizados.
          </p>
          <div className="cta-group">
            <button className="btn-neon lg-btn" onClick={() => navigate('/auth/register')}>
              Implementar na Minha Escola
            </button>
            <span className="glass-text-hint">Fase 6: Plataforma de Elite.</span>
          </div>
        </div>

        <div className="hero-visual">
          {/* Main Terminal Mock */}
          <div className="glass-panel mockup-card main-mockup">
            <div className="mockup-header">
              <div className="mac-dots"><i></i><i></i><i></i></div>
              <span className="mockup-title">AI Engine: Processando Matrícula HP-1980</span>
            </div>
            <div className="mockup-body">
              <div className="skeleton line-short"></div>
              <div className="skeleton line-long glow-analyze"></div>
              <div className="ai-typing-effect">
                <span className="text-emerald-400">{'>>>'}</span> Analisando boletim ruim de Poções...<br/>
                <span className="text-emerald-400">{'>>>'}</span> Diagnosticando lacuna no 3º Bimestre.<br/>
                <span className="text-gradient-cyan">[GERAÇÃO PEDAGÓGICA FINALIZADA]</span>
              </div>
            </div>
          </div>
          
          <div className="glass-panel mockup-card float-left">
            <div className="stat-circle">
              <svg viewBox="0 0 36 36" className="circular-chart cyan">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray="94, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="stat-value">94%</div>
            </div>
            <span>Retenção Analítica C-Level</span>
          </div>
        </div>
      </main>

      {/* ==================================================== */}
      {/* SECTION 2: O MOTOR GENAI (SHOWCASE DO PROFESSOR)   */}
      {/* ==================================================== */}
      <section className="feature-section showcase-ai reveal-on-scroll">
          <div className="section-container">
            <div className="feature-text">
                <h3 className="section-eyebrow text-gradient-cyan">O Poder nas mãos do Corpo Docente</h3>
                <h2 className="section-title">O Professor não digita planos. Ele aprova.</h2>
                <p className="section-desc">
                    Quando chega a hora de recuperar a nota de uma Turma inteira, um clique no "AI Reactor"
                    acessa a Modelagem GenAI. O backend cruza os diagnósticos de anos passados e cria avaliações paramétricas Zod (SDD) infalíveis na tela.
                </p>
            </div>
            
            <div className="feature-visual large-terminal glass-panel">
                <div className="mockup-header">
                    <div className="mac-dots"><i></i><i></i><i></i></div>
                    <span className="mockup-title bg-black px-3 py-1 rounded shadow">AtividadeGeradaSchema.json</span>
                </div>
                <div className="code-block">
                    <pre>
                        <code>
                            <span className="code-key">"tituloDaAtividade"</span>: <span className="code-str">"[Custo Zero] Missão de Revisão B2B"</span>,<br/>
                            <span className="code-key">"resumoPedagogico"</span>: <span className="code-str">"Detecção de Falha estrutural em Matemática Básica."</span>,<br/>
                            <span className="code-key">"pontosDeAtencao"</span>: [<br/>
                                &nbsp;&nbsp;<span className="code-str">"Foco 1 - Restauração"</span>,<br/>
                                &nbsp;&nbsp;<span className="code-str">"Foco 2 - Revisão Espacial"</span><br/>
                            ],<br/>
                            <span className="code-key">"questoes"</span>: [...]
                        </code>
                    </pre>
                </div>
            </div>
          </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 3: GOVERNANÇA (SHOWCASE DA SECRETARIA)     */}
      {/* ==================================================== */}
      <section className="feature-section showcase-gov reveal-on-scroll">
        <div className="section-container reverse-layout">
            <div className="feature-visual shield-visual">
                {/* SVG 3D Abstract Representation of B2B Multi-Tenant Vault */}
                <div className="vault-core">
                   <div className="vault-ring ring-1"></div>
                   <div className="vault-ring ring-2"></div>
                   <div className="vault-lock glass-panel">
                       <span className="text-4xl">🔐</span>
                       <h4>Isolamento Inquebrável</h4>
                       <p className="text-xs text-center text-gray-400">Seus dados herméticos via tenantId.</p>
                   </div>
                </div>
            </div>
            
            <div className="feature-text text-right">
                <h3 className="section-eyebrow text-emerald-400">Controle Mestre</h3>
                <h2 className="section-title">A Secretaria e a Soberania dos Dados Institucionais.</h2>
                <p className="section-desc">
                    Nenhum aluno nasce sem permissão. Nenhuma disciplina vaza. 
                    Nossa arquitetura de Controle de Acesso Rígido (RBAC) garante
                    que apenas a Diretoria Escolar crie as turmas e assinale os professores, com um isolamento criptografado *Multi-Tenant* intransponível no MongoDB.
                </p>
            </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* SECTION 4: CTA FINAL MAGNATA B2B       */}
      {/* ======================================= */}
      <section className="cta-final-section reveal-on-scroll">
         <div className="cta-final-card glass-panel">
            <div className="ambient-glow emerald-glow"></div>
             <h2>Escalone sua Estrutura Educacional Hoje</h2>
             <p>Sem chamados. Sem configuração impossível. A sua fundação 100% pronta e tipada para suportar a Educação B2B Moderna.</p>
             <div className="cta-final-buttons">
                <button className="btn-neon lg-btn scale-up" onClick={() => navigate('/auth/register')}>
                    Reinventar Minha Escola
                </button>
             </div>
         </div>
      </section>

      {/* ======================================= */}
      {/* FINAL: CREDITS & FOOTER B2B             */}
      {/* ======================================= */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="flow-dot small"></div>
            <h3>AcademiaFlow</h3>
          </div>
          <div className="footer-credits text-gradient-cyan">
             <p>Idealizado e Desenvolvido por <strong>Leonardo Maximino Bernardo</strong></p>
          </div>
          <p className="footer-copyright text-gray-400">
             © {new Date().getFullYear()} AcademiaFlow Educacional. Todos os direitos de Arquitetura Multi-Tenant e IA Sênior reservados.
          </p>
        </div>
      </footer>
      
      {/* Atmosfera do Site */}
      <div className="ambient-glow cyan-glow"></div>
      <div className="ambient-glow purple-glow"></div>
    </div>
  );
}
