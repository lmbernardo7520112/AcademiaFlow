import mongoose, { Schema } from 'mongoose';

const alunoSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    matricula: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },
    dataNascimento: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    transferido: {
      type: Boolean,
      default: false,
    },
    abandono: {
      type: Boolean,
      default: false,
    },
    normalizedName: {
      type: String,
      index: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Normalização de status: se transferido ou abandono, isActive = false
alunoSchema.pre('save', function (next) {
  if (this.transferido || this.abandono) {
    this.isActive = false;
  }
  // Compute normalizedName for deterministic matching (Busca Ativa)
  if (this.isModified('name') || !this.normalizedName) {
    this.normalizedName = (this.name as string)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }
  next();
});

alunoSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Record<string, unknown>;
  if (update.transferido === true || update.abandono === true) {
    this.set({ isActive: false });
  }
  next();
});

export const AlunoModel = mongoose.model('Aluno', alunoSchema);
