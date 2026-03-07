export type SupportedProjectType = 'saas' | 'directory' | 'website';

export interface ProjectPlan {
  slug: string;
  projectType: SupportedProjectType;
  oneSentencePitch: string;
  targetUser: string;
  primaryMonetization: string[];
  mvpDefinition: {
    deliverables: string[];
    timeboxHours: number;
    successMetric: string;
  };
  buildPlan: {
    steps: string[];
    tech: string[];
    risks: string[];
    constraints: string[];
  };
  executionContext: {
    trigger: string;
    coreInputs: string[];
    coreOutputs: string[];
    mustHaveV1Features: string[];
    outOfScopeForV1: string[];
    suggestedIntegrations: string[];
    operationalNotes: string[];
  };
  testPlan: {
    channels: string[];
    budget: number;
    tracking: string[];
    goNoGo: string[];
  };
}

export interface ProjectRow {
  id: string;
  idea_id: string;
  slug: string;
  project_type: string;
  status: string;
  priority: number;
  decision_notes: string;
  plan: ProjectPlan;
}

export interface ReviewContext {
  idea_title: string;
  idea_summary: string;
  idea_audience: string;
  idea_pain: string;
  idea_workaround: string;
  idea_frequency: string;
  evaluation_notes: string | null;
  evaluation_score_total: number | null;
  idea_sources: Array<{ platform?: string; url?: string; context?: string }> | null;
}

export interface BuildArtifact {
  projectSlug: string;
  projectType: SupportedProjectType;
  status: 'BUILDING' | 'PAUSED';
  template: string;
  generatedAppPath: string;
  artifacts: string[];
  validation: {
    installCommand: string;
    buildCommand: string;
    buildPassed: boolean;
    notes: string[];
  };
  generatedAt: string;
}