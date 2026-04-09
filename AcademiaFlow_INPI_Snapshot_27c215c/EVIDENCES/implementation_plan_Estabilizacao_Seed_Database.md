# Plano de Implementação: Correção Forense do Bundle INPI (AcademiaFlow 27c215c) - REVISÃO RIGOROSA

Este plano estabelece os procedimentos mandatórios para a correção do bundle `AcademiaFlow_INPI_Snapshot_27c215c`, focando em integridade documental e força probatória.

## User Review Required

> [!IMPORTANT]
> **GATE ABORTIVO**: A execução será interrompida imediatamente se a *working tree* não estiver limpa ou se o HEAD não for o commit `27c215c`.
> **ORIGEM DAS EVIDÊNCIAS**: Criado o `MANIFESTS/EVIDENCE_SOURCE_MAP.txt` para rastreabilidade total.

## 1. Verificações de Partida (Abortive Gates)

O processo deve iniciar obrigatoriamente com:
- `git rev-parse --short HEAD`: Deve retornar `27c215c`.
- `git status --porcelain`: Deve retornar vazio. 
- **Ação**: Se qualquer verificação falhar, abortar o processo e reportar ao usuário.

## 2. Método de Extração do SOURCE

- **Decisão**: O diretório `SOURCE/` será **REGENERADO deterministicamente** a partir do commit `27c215c`.
- **Procedimento**:
  1. Limpar `SOURCE/` atual.
  2. Executar `git archive 27c215c` ou `cp` seletivo do estado congelado.
  3. Aplicar exclusões de higiene (node_modules, .git, etc.).

## 3. Recomposição de Evidências e Cadeia de Custódia

### Preenchimento de `EVIDENCES/`
- `implementation_plan.md` -> `EVIDENCES/implementation_plan_Estabilizacao_Seed_Database.md`
- `walkthrough.md` -> `EVIDENCES/walkthrough_Estabilizacao_Pipeline.md`
- `/home/leonardomaximinobernardo/.gemini/antigravity/brain/962cf7d2-f93f-4311-a4d3-9b1177abae6e/walkthrough.md` -> `EVIDENCES/walkthrough_fase_8completa_academiaflow_v2.md`
- `github_actions_success_run_54_1775497753610.png` -> `EVIDENCES/CI_Success_Run_54.png`

### Mapeamento de Fontes (`MANIFESTS/EVIDENCE_SOURCE_MAP.txt`)
Criar arquivo contendo:
- Nome Final | Nome Original | Caminho Original | Hash Original (SHA-256)

### Metadados de Commit (`REPORT/COMMIT.txt`)
- Commit: `27c215c`
- Branch: `fix/v10-frontend-robustness`
- Timestamp: ISO 8601
- Racional: "marco técnico com CI verde, seed portátil, validação estrutural e analytics materializados"

## 4. Relatórios e Manifestos

### `REPORT/SNAPSHOT_REPORT.md` (Reescrita Integral)
- Título Formal: "Snapshot Probatório AcademiaFlow - INPI"
- Contagens Reais: SOURCE, EVIDENCES, TOTAL.
- Declaração de Working Tree e Método de Regeneração.
- **SHA-256 do ZIP Final**: Campo obrigatório para conferência externa.
- Seção de "Cadeia de Custódia" completa e formal.

### `MANIFESTS/EVIDENCES_FILES.txt`
- Lista exata dos arquivos em `EVIDENCES/`.

## 5. Selagem e Hashing

- **Hashing Interno**: `HASHES/HASHES_SHA256.txt` (todos os arquivos, exceto a pasta HASHES).
- **Geração do ZIP**: `AcademiaFlow_INPI_Snapshot_27c215c.zip`.
- **Hashing do ZIP**: 
  - Gerar `HASHES/ZIP_SHA256.txt` (contendo o hash do arquivo .zip recém-criado).
  - *Nota*: O hash do ZIP será reportado no `SNAPSHOT_REPORT.md` e na resposta final.

---

## Verification Plan

### Automated
- `find AcademiaFlow_INPI_Snapshot_27c215c/SOURCE -type d -name ".git" | grep .` (Deve ser vazio).
- `cat AcademiaFlow_INPI_Snapshot_27c215c/REPORT/SNAPSHOT_REPORT.md | grep "SHA-256 do ZIP Final"`.
- `wc -l` de manifestos vs contagem real de arquivos.
