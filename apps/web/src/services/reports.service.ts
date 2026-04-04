import { api } from './api.js';
import type { 
  TurmaDashboard, 
  ProfessorAnalytics, 
  TurmasTaxasResponse 
} from '@academiaflow/shared';

export const reportsService = {
  async getDashboardTurma(turmaId: string): Promise<TurmaDashboard> {
    const { data } = await api.get<{ success: boolean; data: TurmaDashboard }>(`/reports/turmas/${turmaId}/dashboard`);
    return data.data;
  },

  async getProfessorAnalytics(turmaId?: string): Promise<ProfessorAnalytics> {
    const { data } = await api.get<{ success: boolean; data: ProfessorAnalytics }>('/reports/professor/analytics', {
      params: { turmaId }
    });
    return data.data;
  },

  async getTurmasTaxas(year?: number): Promise<TurmasTaxasResponse> {
    const { data } = await api.get<{ success: boolean; data: TurmasTaxasResponse }>('/reports/turmas/taxas', {
      params: { year }
    });
    return data.data;
  },

  async exportBoletins(turmaId: string, year?: number) {
    const response = await api.get(`/reports/turmas/${turmaId}/boletins/export`, {
      params: { year },
      responseType: 'blob'
    });
    
    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const contentDisposition = response.headers['content-disposition'];
    let fileName = `boletins_${turmaId}.xlsx`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch?.[1]) fileName = fileNameMatch[1];
    }
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
