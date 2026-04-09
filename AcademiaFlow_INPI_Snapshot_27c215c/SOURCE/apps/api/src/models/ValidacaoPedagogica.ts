import mongoose, { Schema } from 'mongoose';

const validacaoPedagogicaSchema = new Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    professorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: 'Turma',
      required: true,
    },
    disciplinaId: {
      type: Schema.Types.ObjectId,
      ref: 'Disciplina',
      required: true,
    },
    bimester: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['ANALYSIS', 'EXERCISES'],
      required: true,
    },
    content: {
      type: String, // Texto formatado da análise
    },
    exercises: [{
      question: String,
      options: [String],
      correctAnswer: String,
      explanation: String
    }],
    targetStudents: [{
      type: Schema.Types.ObjectId,
      ref: 'Aluno'
    }]
  },
  {
    timestamps: true,
  }
);

export const ValidacaoPedagogicaModel = mongoose.model('ValidacaoPedagogica', validacaoPedagogicaSchema);
