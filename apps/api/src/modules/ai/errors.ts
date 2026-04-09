export class AIProviderError extends Error {
  constructor(message: string, public readonly statusCode: number = 502) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class UnparseableContentError extends AIProviderError {
  constructor(message: string = 'O motor de IA retornou uma interface não compatível com análise de dados') {
    super(message, 502);
    this.name = 'UnparseableContentError';
  }
}

export class AISchemaValidationError extends AIProviderError {
  constructor(message: string = 'Dados omitidos estruturalmente pela IA no payload solicitado') {
    super(message, 502);
    this.name = 'AISchemaValidationError';
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(message: string = 'Timeout ao aguardar resposta do provedor de inteligência artificial') {
    super(message, 504);
    this.name = 'AITimeoutError';
  }
}

export class AIRateLimitError extends AIProviderError {
  constructor(message: string = 'O limite de requisições do provedor de IA foi atingido') {
    super(message, 429);
    this.name = 'AIRateLimitError';
  }
}
