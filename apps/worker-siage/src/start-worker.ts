#!/usr/bin/env tsx
/**
 * @module start-worker
 * Production entrypoint for the SIAGE worker process.
 *
 * Wires the real @academiaflow/siage-bridge into the BullMQ consumer.
 * Uses the real navigation flow: Login → Minhas Turmas → Coord. Pedagógica
 * → Turma table → Discipline → Boletim → Grade extraction.
 *
 * Coverage instrumentation: logs per-discipline and per-page counters
 * for auditability.
 *
 * Usage:
 *   REDIS_URL=redis://... API_BASE_URL=http://... npx tsx src/start-worker.ts
 */
import { chromium } from 'playwright';
import {
  SiageNavigator,
  type BoletimGrade,
  type ComponentScanResult,
} from '@academiaflow/siage-bridge';
import { createSiageWorker, type BridgeExecutor, type ExtractedRecord } from './consumer.js';
import { getWorkerEnv } from './env.js';

const SIAGE_BASE_URL = process.env.SIAGE_BASE_URL ?? 'https://escola.see.pb.gov.br/auth';

const env = getWorkerEnv();

console.log('═══════════════════════════════════════════════════');
console.log('  SIAGE Worker — Starting (real bridge)');
console.log('═══════════════════════════════════════════════════');
console.log(`  Redis:       ${env.REDIS_URL.replace(/\/\/.*@/, '//***@')}`);
console.log(`  API:         ${env.API_BASE_URL}`);
console.log(`  SIAGE:       ${SIAGE_BASE_URL}`);
console.log(`  Concurrency: ${env.WORKER_CONCURRENCY}`);
console.log(`  ENV:         ${env.NODE_ENV}`);
console.log('═══════════════════════════════════════════════════');

/**
 * Turma name mapping: AcademiaFlow → SIAGE
 *
 * AcademiaFlow uses "1º ANO A" while SIAGE uses "1ª Série A".
 * This mapping is explicit and auditable.
 */
const TURMA_NAME_MAP: Record<string, string> = {
  '1º ANO A': '1ª Série A',
  '1º ANO B': '1ª Série B',
  '2º ANO A': '2ª Série A',
  '2º ANO B': '2ª Série B',
  '3º ANO A': '3ª Série A',
  '3º ANO B': '3ª Série B',
};

function mapTurmaName(academiaFlowName: string): string {
  const mapped = TURMA_NAME_MAP[academiaFlowName];
  if (mapped) {
    console.log(`  → Turma mapping: "${academiaFlowName}" → "${mapped}"`);
    return mapped;
  }
  console.log(`  → No turma mapping for "${academiaFlowName}", using as-is`);
  return academiaFlowName;
}

/**
 * BNCC discipline list — only these disciplines should be imported.
 * Non-BNCC components (e.g. "Educação Digital") are skipped.
 */
const BNCC_DISCIPLINES = [
  'Biologia', 'Física', 'Química',
  'Matemática', 'Língua Portuguesa', 'Língua Inglesa',
  'História', 'Geografia', 'Filosofia', 'Sociologia',
  'Educação Física', 'Arte',
];

/**
 * Coverage metrics — accumulated during extraction.
 */
interface CoverageMetrics {
  turma: string;
  componentScan: ComponentScanResult;
  disciplines: {
    name: string;
    boletimPages: number;
    studentsExtracted: number;
    studentsWithGrade: number;
    studentsNotRegistered: number;
  }[];
  disciplinesSkippedNotFound: string[];
  disciplinesSkippedRejected: string[];
  totalStudents: number;
  totalWithGrade: number;
  totalNotRegistered: number;
}

/**
 * Real bridge executor with coverage instrumentation.
 */
const bridgeExecutor: BridgeExecutor = async (params) => {
  console.log(`🔗 Bridge: year=${params.year} bim=${params.bimester} turma=${params.turmaFilter ?? 'ALL'}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const nav = new SiageNavigator(page as never, { baseUrl: SIAGE_BASE_URL });

    // Step 1: Login
    console.log('  → Logging into SIAGE...');
    await nav.login({ username: params.username, password: params.password });
    console.log('  → Login successful');

    // Step 2: Select academic year
    console.log(`  → Selecting year ${params.year}...`);
    await nav.selectYear(String(params.year));
    console.log('  → Year selected');

    // Step 3: Navigate to Coordenação Pedagógica
    console.log('  → Navigating to Coordenação Pedagógica...');
    await nav.navigateToCoordenacao();
    console.log('  → Coordenação Pedagógica reached');

    // Step 3b: Select turma (with name mapping)
    const siageTurmaName = params.turmaFilter
      ? mapTurmaName(params.turmaFilter)
      : undefined;

    if (siageTurmaName) {
      console.log(`  → Selecting turma: ${siageTurmaName}...`);
      await nav.selectTurma(siageTurmaName);
      console.log(`  → Turma selected: ${siageTurmaName}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // COVERAGE SCAN: Read ALL pages of the component table first
    // ════════════════════════════════════════════════════════════════════════
    console.log('  ────────────────────────────────────────');
    console.log('  → SCANNING component table for BNCC-eligible disciplines...');
    const scan = await nav.scanComponentTable(BNCC_DISCIPLINES);

    console.log(`  → Component table: ${scan.totalRows} rows across ${scan.totalPages} page(s)`);
    console.log(`  → Eligible BNCC disciplines: ${scan.eligible.length}`);
    for (const e of scan.eligible) {
      console.log(`    ✓ ${e.name} (${e.tipo}) — professor: ${e.professor} [page ${e.page}]`);
    }
    console.log(`  → Rejected: ${scan.rejected.length}`);
    for (const r of scan.rejected) {
      console.log(`    ✗ ${r.name} — ${r.reason} [page ${r.page}]`);
    }
    console.log('  ────────────────────────────────────────');

    // Initialize coverage metrics
    const metrics: CoverageMetrics = {
      turma: siageTurmaName ?? params.turmaFilter ?? 'UNKNOWN',
      componentScan: scan,
      disciplines: [],
      disciplinesSkippedNotFound: [],
      disciplinesSkippedRejected: [],
      totalStudents: 0,
      totalWithGrade: 0,
      totalNotRegistered: 0,
    };

    // Step 4: Iterate ONLY the eligible disciplines from the scan
    const allRecords: ExtractedRecord[] = [];

    for (const eligibleDisc of scan.eligible) {
      try {
        console.log(`  → Processing BNCC discipline: ${eligibleDisc.name}...`);
        await nav.selectDisciplina(eligibleDisc.name);
        console.log(`  → Discipline selected: ${eligibleDisc.name}`);

        // Step 5: Open Boletim Escolar
        console.log(`  → Opening Boletim Escolar...`);
        await nav.openBoletim();

        // Step 6: Extract grades for target bimester
        console.log(`  → Extracting grades for bimester ${params.bimester}...`);
        const grades: BoletimGrade[] = await nav.extractGrades(params.bimester);

        // Count grades vs not_registered
        const withGrade = grades.filter(g => g.value !== null).length;
        const notRegistered = grades.filter(g => g.value === null).length;

        console.log(`  → ${eligibleDisc.name}: ${grades.length} students (${withGrade} graded, ${notRegistered} not_registered)`);

        metrics.disciplines.push({
          name: eligibleDisc.name,
          boletimPages: 0, // extractGrades logs this internally
          studentsExtracted: grades.length,
          studentsWithGrade: withGrade,
          studentsNotRegistered: notRegistered,
        });
        metrics.totalStudents += grades.length;
        metrics.totalWithGrade += withGrade;
        metrics.totalNotRegistered += notRegistered;

        // Map to ExtractedRecord
        for (const grade of grades) {
          allRecords.push({
            alunoName: grade.studentName,
            matriculaSiage: '', // DOM table may not have matricula
            disciplinaName: eligibleDisc.name,
            turmaName: params.turmaFilter ?? siageTurmaName ?? '',
            bimester: params.bimester,
            value: grade.value,
          });
        }

        // Navigate back to component table
        await page.goBack({ waitUntil: 'networkidle' });
        await page.goBack({ waitUntil: 'networkidle' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('not found')) {
          console.log(`  → Discipline "${eligibleDisc.name}" not found during navigation, skipping`);
          metrics.disciplinesSkippedNotFound.push(eligibleDisc.name);
          continue;
        }
        throw err; // Re-throw unexpected errors
      }
    }

    // Record BNCC disciplines that are NOT eligible
    const eligibleNames = scan.eligible.map(e => e.name);
    for (const disc of BNCC_DISCIPLINES) {
      if (!eligibleNames.includes(disc)) {
        const rejection = scan.rejected.find(r =>
          r.name.toLowerCase().includes(disc.toLowerCase()),
        );
        if (rejection) {
          metrics.disciplinesSkippedRejected.push(`${disc}: ${rejection.reason}`);
        } else {
          metrics.disciplinesSkippedRejected.push(`${disc}: not present in component table`);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // COVERAGE REPORT
    // ════════════════════════════════════════════════════════════════════════
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║         COVERAGE REPORT — SIAGE EXTRACTION          ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║ Turma:     ${metrics.turma.padEnd(40)}║`);
    console.log(`║ Year:      ${String(params.year).padEnd(40)}║`);
    console.log(`║ Bimester:  ${String(params.bimester).padEnd(40)}║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ COMPONENT TABLE SCAN                                ║');
    console.log(`║   Total rows:    ${String(scan.totalRows).padEnd(34)}║`);
    console.log(`║   Total pages:   ${String(scan.totalPages).padEnd(34)}║`);
    console.log(`║   BNCC eligible: ${String(scan.eligible.length).padEnd(34)}║`);
    console.log(`║   Rejected:      ${String(scan.rejected.length).padEnd(34)}║`);
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ DISCIPLINE COVERAGE                                 ║');
    for (const d of metrics.disciplines) {
      const line = `  ${d.name}: ${d.studentsExtracted} students (${d.studentsWithGrade} graded, ${d.studentsNotRegistered} nr)`;
      console.log(`║ ${line.padEnd(51)}║`);
    }
    if (metrics.disciplinesSkippedNotFound.length > 0) {
      console.log('║   Skipped (not found during nav):                   ║');
      for (const s of metrics.disciplinesSkippedNotFound) {
        console.log(`║     - ${s.padEnd(45)}║`);
      }
    }
    if (metrics.disciplinesSkippedRejected.length > 0) {
      console.log('║   Skipped (not eligible):                           ║');
      for (const s of metrics.disciplinesSkippedRejected) {
        console.log(`║     - ${s.padEnd(45)}║`);
      }
    }
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║ TOTALS                                              ║');
    console.log(`║   Total students scanned:  ${String(metrics.totalStudents).padEnd(24)}║`);
    console.log(`║   With grade (imported):   ${String(metrics.totalWithGrade).padEnd(24)}║`);
    console.log(`║   Not registered:          ${String(metrics.totalNotRegistered).padEnd(24)}║`);
    console.log(`║   Total records:           ${String(allRecords.length).padEnd(24)}║`);
    const covRate = metrics.totalStudents > 0
      ? ((metrics.totalWithGrade + metrics.totalNotRegistered) / metrics.totalStudents * 100).toFixed(1)
      : '0.0';
    console.log(`║   Coverage rate:           ${(covRate + '%').padEnd(24)}║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    console.log(`  → Total extracted: ${allRecords.length} records`);
    return allRecords;

  } finally {
    await context.close();
    await browser.close();
  }
};

const worker = createSiageWorker(bridgeExecutor);

console.log('✅ Worker listening for jobs on queue: siage-sync');

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n⏹️  Received ${signal} — shutting down worker...`);
  await worker.close();
  console.log('👋 Worker stopped.');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
