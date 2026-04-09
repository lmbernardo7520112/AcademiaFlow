import { UserModel } from '../../models/User.js';
import argon2 from 'argon2';
import type { CreateUserPayload, LoginPayload } from '@academiaflow/shared';

import mongoose from 'mongoose';

export class AuthService {
  async register(data: CreateUserPayload) {
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) {
      throw new Error('Email já em uso');
    }

    const hashedPassword = await argon2.hash(data.password);
    const tenantId = new mongoose.Types.ObjectId().toHexString();
    
    const user = await UserModel.create({
      ...data,
      password: hashedPassword,
      tenantId,
    });

    const userObj = user.toObject();
    delete (userObj as { password?: string }).password;
    
    return userObj;
  }

  async login(data: LoginPayload) {
    const user = await UserModel.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isValid = await argon2.verify(user.password, data.password);
    if (!isValid) {
      throw new Error('Credenciais inválidas');
    }

    const userObj = user.toObject();
    delete (userObj as { password?: string }).password;
    delete (userObj as { refreshToken?: string }).refreshToken;
    return userObj;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    await UserModel.findByIdAndUpdate(userId, { refreshToken });
  }

  async verifyRefreshToken(userId: string, refreshToken: string) {
    const user = await UserModel.findById(userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Refresh token inválido ou expirado');
    }
    return user;
  }

  async getById(id: string) {
    const user = await UserModel.findById(id);
    if (!user) throw new Error('Usuário não encontrado');
    return user;
  }

  async listUsers(tenantId: string, page = 1, limit = 20, role?: string) {
    const skip = (page - 1) * limit;
    
    // Projeção segura: Nunca retornar senhas ou tokens em listagens
    const query: Record<string, string | boolean> = { tenantId, isActive: true };
    if (role) {
      query.role = role;
    }

    const users = await UserModel.find(query)
      .select('-password -refreshToken')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await UserModel.countDocuments(query);

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      }
    };
  }

  async logout(userId: string) {
    // Invalidação operacional do refresh token
    await UserModel.findByIdAndUpdate(userId, { refreshToken: null });
    return { success: true, message: 'Sessão encerrada com sucesso' };
  }
}


export const authService = new AuthService();
