import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

describe('AI Engine Module Integration (Mocked Provider)', () => {
  let app: FastifyInstance;
  let secTkn: string;
  let alunoId: string;
  let disciplinaId: string;
  let turmaId: string;

  beforeAll(async () => {
    app = await buildApp();
    
    // 1. Cria um Usuário Secretaria para montar a estrutura escolar (Turmas, Alunos, Disciplinas)
    const payloadSecretaria = { name: 'Maga McGonagall', email: `sec.${Date.now()}@academiaflow.com`, password: 'password123', role: 'secretaria' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: payloadSecretaria });
    const secLogin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: payloadSecretaria.email, password: 'password123' } });
    secTkn = secLogin.json().data.token;

    // 2. Secretaria Cria uma Turma, Disciplina e Aluno
    const tResp = await app.inject({ method: 'POST', url: '/api/turmas', headers: { Authorization: `Bearer ${secTkn}` }, payload: { name: 'Pocoes Av.', year: 2026 } });
    turmaId = tResp.json().data._id;

    const dResp = await app.inject({ method: 'POST', url: '/api/disciplinas', headers: { Authorization: `Bearer ${secTkn}` }, payload: { name: 'Poções' } });
    disciplinaId = dResp.json().data._id;

    const aResp = await app.inject({
      method: 'POST', url: '/api/alunos', headers: { Authorization: `Bearer ${secTkn}` },
      payload: { name: 'Harry Potter', matricula: `HP-${Date.now()}`, dataNascimento: '1980-07-31', turmaId: turmaId }
    });
    alunoId = aResp.json().data._id;

    // Professor isn't needed here anymore since each registration spawns a new isolated Tenant.
    // For the test, we'll act as the school administration (Secretaria) sending commands via the AI Reactor

    // 3. Admin avalia o aluno gerando fechamento de notas com necessidade pedagógica
    await app.inject({
      method: 'POST', url: '/api/notas', headers: { Authorization: `Bearer ${secTkn}` },
      payload: { alunoId, disciplinaId, turmaId, year: 2026, bimester: 1, value: 3.5 }
    });
  });

  it('POST /api/ai/generate-activity deve disparar a inteligência e retornar plano Mock validado', async () => {
    const aiPayload = {
      alunoId: alunoId,
      focoAtividade: 'reforco-pocoes',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/generate-activity',
      headers: { Authorization: `Bearer ${secTkn}` },
      payload: aiPayload,
    });

    const body = response.json();
    console.error('DEBUGGING AI 400:', body);
    expect(response.statusCode).toBe(200);
    
    // Sucesso HTTP e Contrato Zod Custo Zero comprovado
    expect(body.success).toBe(true);
    
    // Validando output exato do provedor Falso TDD (Sem consumir quota do Google)
    expect(body.data.tituloDaAtividade).toBe('[TESTE Mock] Recuperação Direcionada');
    expect(body.data).toHaveProperty('resumoPedagogico');
    expect(body.data.questoes).toBeInstanceOf(Array);
    expect(body.data.questoes[0].alternativas.length).toBeGreaterThanOrEqual(2);
    expect(body.data.questoes[0]).toHaveProperty('correta');
  });

  it('POST /api/ai/generate-activity deve barrar aluno de outro tenant ou falhar graciosamente', async () => {
    // Simulando tentativa de injeção direta de uuid aleatória
    const aiPayload = {
        alunoId: '65f1a234b3c4d5e6f7a8b9c0', // ObjectID Falso
        focoAtividade: 'reforco-vazio',
    };
  
    const response = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-activity',
        headers: { Authorization: `Bearer ${secTkn}` },
        payload: aiPayload,
    });
  
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('Aluno não encontrado neste ambiente');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
