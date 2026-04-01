/**
 * Root application component.
 * Phase 1: Minimal shell to verify the build pipeline works.
 */
export function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-primary">Academia</span>Flow
        </h1>
        <p className="text-muted-foreground text-lg">
          Sistema de Gestão Acadêmica com IA
        </p>
        <div className="flex gap-3 justify-center">
          <span className="px-3 py-1 text-sm bg-card rounded-lg border border-border text-muted-foreground">
            React 19
          </span>
          <span className="px-3 py-1 text-sm bg-card rounded-lg border border-border text-muted-foreground">
            Fastify 5
          </span>
          <span className="px-3 py-1 text-sm bg-card rounded-lg border border-border text-muted-foreground">
            Tailwind v4
          </span>
          <span className="px-3 py-1 text-sm bg-card rounded-lg border border-border text-muted-foreground">
            Google Gemini
          </span>
        </div>
      </div>
    </div>
  );
}
