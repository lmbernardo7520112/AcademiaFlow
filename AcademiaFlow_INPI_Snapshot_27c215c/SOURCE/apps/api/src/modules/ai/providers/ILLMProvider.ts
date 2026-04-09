import type { AnyZodObject } from 'zod';

export interface ILLMProvider {
  /**
   * Identifies the provider for tracking/logging purposes
   */
  readonly providerName: string;

  /**
   * Generates a strongly typed structured output from the LLM based on a Zod Schema
   * @param prompt The crafted prompt with context
   * @param schema The Zod Schema that must be enforced as JSON
   */
  generateStructuredData<T>(prompt: string, schema: AnyZodObject): Promise<T>;

  /**
   * Generates a simple text response from the LLM for chat or analysis
   * @param prompt The prompt to be sent
   */
  generateText(prompt: string): Promise<string>;
}
