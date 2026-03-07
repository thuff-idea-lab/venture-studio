import type { ProjectPlan, ReviewContext, SupportedProjectType } from './types';

export function buildProjectFiles(plan: ProjectPlan, context: ReviewContext): Record<string, string> {
  return {
    'package.json': buildGeneratedPackageJson(plan.slug),
    'tsconfig.json': buildGeneratedTsConfig(),
    'next-env.d.ts': '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
    'next.config.ts': 'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = { reactStrictMode: true };\n\nexport default nextConfig;\n',
    'app/layout.tsx': buildGeneratedLayout(plan),
    'app/page.tsx': buildGeneratedPage(plan, context),
    'app/globals.css': buildGeneratedCss(plan.projectType),
    'README.md': buildGeneratedReadme(plan, context),
    '.gitignore': 'node_modules\n.next\nout\n.env\n',
  };
}

function buildGeneratedPackageJson(slug: string): string {
  return JSON.stringify(
    {
      name: slug,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
      dependencies: {
        next: '^15.5.12',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        '@types/node': '^22.10.2',
        '@types/react': '^19.0.8',
        '@types/react-dom': '^19.0.3',
        typescript: '^5.7.2',
      },
    },
    null,
    2,
  );
}

function buildGeneratedTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  );
}

function buildGeneratedLayout(plan: ProjectPlan): string {
  return `import './globals.css';

export const metadata = {
  title: ${JSON.stringify(plan.oneSentencePitch)},
  description: ${JSON.stringify(plan.oneSentencePitch)},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function buildGeneratedPage(plan: ProjectPlan, context: ReviewContext): string {
  const sourceLinks = (context.idea_sources ?? []).filter((source) => source.url).slice(0, 3);
  const sampleItems = plan.projectType === 'directory'
    ? [
        { title: `${plan.targetUser} Option A`, summary: 'First placeholder listing seeded by Builder v1.' },
        { title: `${plan.targetUser} Option B`, summary: 'Swap this with a real imported dataset next.' },
        { title: `${plan.targetUser} Option C`, summary: 'Keep comparison criteria narrow and decision-focused.' },
      ]
    : [
        { title: 'Input accepted', summary: 'This UI shell marks where the first workflow input should enter.' },
        { title: 'Review step', summary: 'Replace this placeholder with the real validation or transformation result.' },
        { title: 'Export action', summary: 'Wire the final button to the narrow output users actually need.' },
      ];

  return `const plan = ${JSON.stringify(plan, null, 2)};
const context = ${JSON.stringify(
    {
      ...context,
      idea_sources: sourceLinks,
      sampleItems,
    },
    null,
    2,
  )};

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Builder v1 generated MVP</p>
        <h1>{plan.oneSentencePitch}</h1>
        <p className="lede">Built for {plan.targetUser}. This first pass keeps scope narrow and focuses on the must-have V1 workflow.</p>
        <div className="hero-meta">
          <div>
            <span>Project type</span>
            <strong>{plan.projectType}</strong>
          </div>
          <div>
            <span>Monetization</span>
            <strong>{plan.primaryMonetization.join(', ')}</strong>
          </div>
          <div>
            <span>Success metric</span>
            <strong>{plan.mvpDefinition.successMetric}</strong>
          </div>
        </div>
      </section>

      <section className="workflow-shell">
        <article className="panel workflow-panel">
          <h2>{plan.projectType === 'directory' ? 'Directory search shell' : 'Primary workflow shell'}</h2>
          <p className="muted">Trigger: {plan.executionContext.trigger}</p>
          <label>
            <span>{plan.executionContext.coreInputs[0] ?? 'Primary input'}</span>
            {plan.projectType === 'directory' ? (
              <input type="text" placeholder="Search by the primary decision field" />
            ) : (
              <textarea rows={8} defaultValue={context.idea_workaround} placeholder="Paste the first supported input here" />
            )}
          </label>
          <button type="button">Run MVP flow</button>
        </article>

        <article className="panel workflow-panel">
          <h2>{plan.projectType === 'directory' ? 'Sample listings' : 'Review output'}</h2>
          <div className="listing-grid">
            {context.sampleItems.map((item: { title: string; summary: string }) => (
              <div className="listing-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h2>Must-have V1</h2>
          <ul>
            {plan.executionContext.mustHaveV1Features.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </article>
        <article className="panel">
          <h2>Out of scope</h2>
          <ul>
            {plan.executionContext.outOfScopeForV1.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h2>Source context</h2>
          <p>{context.idea_summary}</p>
          <p className="muted">Pain: {context.idea_pain}</p>
          <ul>
            {context.idea_sources.length > 0 ? context.idea_sources.map((source: { platform?: string; url?: string }) => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.platform ?? source.url}</a></li>
            )) : <li>No source links available yet.</li>}
          </ul>
        </article>
        <article className="panel">
          <h2>Build priorities</h2>
          <ul>
            {plan.buildPlan.steps.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>
    </main>
  );
}
`;
}

function buildGeneratedCss(projectType: SupportedProjectType): string {
  const accent = projectType === 'directory' ? '#0f766e' : projectType === 'website' ? '#9a3412' : '#1d4ed8';
  return `:root {
  --ink: #18222c;
  --muted: #5f6b76;
  --surface: #f6efe2;
  --panel: rgba(255, 255, 255, 0.86);
  --line: rgba(24, 34, 44, 0.1);
  --accent: ${accent};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--ink);
  font-family: Georgia, 'Iowan Old Style', serif;
  background: radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 30%), linear-gradient(180deg, #fffdf8 0%, var(--surface) 100%);
}
.page-shell { max-width: 1180px; margin: 0 auto; padding: 28px; display: grid; gap: 22px; }
.hero-card, .panel { background: var(--panel); border: 1px solid rgba(255,255,255,0.65); border-radius: 24px; padding: 24px; box-shadow: 0 20px 45px rgba(42,45,52,0.08); }
.eyebrow { margin: 0 0 8px; color: var(--muted); font-family: 'Trebuchet MS', sans-serif; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(2.2rem, 4vw, 3.8rem); line-height: 0.95; }
h2 { margin-top: 0; }
.lede, .muted { color: var(--muted); font-family: 'Trebuchet MS', sans-serif; }
.hero-meta, .grid-two, .workflow-shell { display: grid; gap: 18px; }
.hero-meta { grid-template-columns: repeat(3, minmax(140px, 1fr)); margin-top: 18px; }
.hero-meta div { padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.7); border: 1px solid var(--line); }
.hero-meta span, label span { display: block; margin-bottom: 6px; color: var(--muted); font-family: 'Trebuchet MS', sans-serif; font-size: 0.78rem; text-transform: uppercase; }
.grid-two, .workflow-shell { grid-template-columns: repeat(2, minmax(0, 1fr)); }
textarea, input { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; background: rgba(255,255,255,0.85); }
button { margin-top: 14px; border: 0; border-radius: 999px; background: var(--accent); color: white; padding: 12px 16px; font: inherit; cursor: pointer; }
ul { margin: 0; padding-left: 18px; }
.listing-grid { display: grid; gap: 12px; }
.listing-card { border-radius: 18px; border: 1px solid var(--line); background: rgba(255,255,255,0.74); padding: 16px; }
@media (max-width: 900px) {
  .hero-meta, .grid-two, .workflow-shell { grid-template-columns: 1fr; }
  .page-shell { padding: 16px; }
}
`;
}

function buildGeneratedReadme(plan: ProjectPlan, context: ReviewContext): string {
  return `# ${plan.oneSentencePitch}

This MVP scaffold was generated by Builder v1.

## Context
- Target user: ${plan.targetUser}
- Project type: ${plan.projectType}
- Evaluation score: ${context.evaluation_score_total ?? 'n/a'}

## Includes
- A narrow Next.js app shell
- A first-pass UI around the must-have V1 workflow
- A production build check so the scaffold is runnable

## Next steps
- Replace placeholder workflow logic with the real transformation, search, or comparison behavior
- Wire any required data source or API integration
- Review the generated UI against the project plan before moving forward

## Validation target
${plan.mvpDefinition.successMetric}
`;
}