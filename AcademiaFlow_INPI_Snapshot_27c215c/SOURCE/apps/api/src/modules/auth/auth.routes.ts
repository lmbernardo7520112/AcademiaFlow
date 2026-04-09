import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authService } from './auth.service.js';
import { createUserSchema, loginSchema } from '@academiaflow/shared';
import { env } from '../../config/env.js';

export const authRoutes: FastifyPluginAsyncZod = async (fastify) => {

  fastify.post(
    '/register',
    {
      schema: {
        body: createUserSchema,
      },
    },
    async (request, reply) => {
      try {
        const payload = request.body as import('@academiaflow/shared').CreateUserPayload;
        const user = await authService.register(payload);
        
        reply.code(201).send({
          success: true,
          data: user,
          message: 'Usuário criado com sucesso',
        });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
  );

  fastify.post(
    '/login',
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request, reply) => {
      try {
        const payload = request.body as import('@academiaflow/shared').LoginPayload;
        const user = await authService.login(payload);
        
        const token = await reply.jwtSign(
          { id: String(user._id), role: user.role, tenantId: String(user.tenantId) },
          { expiresIn: env.JWT_EXPIRES_IN }
        );

        const refreshToken = await reply.jwtSign(
          { id: String(user._id), role: user.role, tenantId: String(user.tenantId) },
          { expiresIn: '7d' }
        );

        await authService.updateRefreshToken(String(user._id), refreshToken);

        reply.send({
          success: true,
          data: { user, token, refreshToken },
          message: 'Login realizado com sucesso',
        });
      } catch (error: Error | unknown) {
        reply.code(401).send({
          success: false,
          message: error instanceof Error ? error.message : 'Não autorizado',
        });
      }
    }
  );

  fastify.post(
    '/refresh',
    async (request, reply) => {
      try {
        const { refreshToken } = request.body as { refreshToken: string };
        if (!refreshToken) throw new Error('Refresh token não fornecido');

        const decoded = await fastify.jwt.verify<{ id: string }>(refreshToken);
        const user = await authService.verifyRefreshToken(decoded.id, refreshToken);

        const newToken = await reply.jwtSign(
          { id: String(user._id), role: user.role, tenantId: String(user.tenantId) },
          { expiresIn: env.JWT_EXPIRES_IN }
        );

        const newRefreshToken = await reply.jwtSign(
          { id: String(user._id), role: user.role, tenantId: String(user.tenantId) },
          { expiresIn: '7d' }
        );

        await authService.updateRefreshToken(String(user._id), newRefreshToken);

        reply.send({
          success: true,
          data: { token: newToken, refreshToken: newRefreshToken },
        });
      } catch (error: Error | unknown) {
        reply.code(401).send({
          success: false,
          message: error instanceof Error ? error.message : 'Refresh token inválido',
        });
      }
    }
  );

  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const decoded = request.user as { id: string };
        const user = await authService.getById(decoded.id);
        reply.send({
          success: true,
          data: user,
        });
      } catch (error: Error | unknown) {
        reply.code(404).send({
          success: false,
          message: error instanceof Error ? error.message : 'Usuário não encontrado',
        });
      }
    }
  );

  fastify.get(
    '/users',
    {
      onRequest: [fastify.authenticate],
      preHandler: [fastify.authorize(['admin', 'secretaria', 'administrador'])],
    },
    async (request, reply) => {
      try {
        // [TENANT ISOLATION] Retorna apenas usuários do tenant autenticado
        const tenantId = request.user.tenantId;
        const { page, limit } = request.query as { page?: number, limit?: number };
        const result = await authService.listUsers(tenantId, page, limit);
        reply.send({
          success: true,
          ...result
        });
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao listar usuários',
        });
      }
    }
  );

  fastify.post(
    '/logout',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userId = request.user.id;
        const result = await authService.logout(userId);
        reply.send(result);
      } catch (error: Error | unknown) {
        reply.code(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Erro ao realizar logout',
        });
      }
    }
  );
};

