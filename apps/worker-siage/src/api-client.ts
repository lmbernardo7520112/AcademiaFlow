/**
 * @module api-client
 * Internal API client for worker → API communication.
 * Uses X-Worker-Secret header auth, NOT JWT.
 */

export interface ApiClientConfig {
  baseUrl: string;
  workerSecret: string;
}

export class SiageApiClient {
  private baseUrl: string;
  private workerSecret: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.workerSecret = config.workerSecret;
  }

  private async request(path: string, body: unknown): Promise<{ success: boolean; data?: unknown; message?: string }> {
    const url = `${this.baseUrl}/api/siage/internal${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': this.workerSecret,
      },
      body: JSON.stringify(body),
    });

    const json = await response.json() as { success: boolean; data?: unknown; message?: string };
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${json.message ?? 'Unknown error'}`);
    }
    return json;
  }

  async updateRunStatus(runId: string, tenantId: string, status: string, errorMessage?: string) {
    return this.request(`/${runId}/status`, { tenantId, status, errorMessage });
  }

  async ingestItems(runId: string, tenantId: string, items: unknown[]) {
    return this.request(`/${runId}/ingest`, { tenantId, items });
  }

  async triggerImport(runId: string, tenantId: string) {
    return this.request(`/${runId}/import`, { tenantId });
  }
}
