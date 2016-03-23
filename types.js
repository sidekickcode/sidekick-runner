// @flow

// all information required to start a run
export type RunnerConfig = {
  target: Target,
  repo?: Repo 
};

/**
 * repos abstract away access file access on a target
 */
export type Repo = {
  file: (path: string) => Promise<RepoFile>,
};

export type RepoFile = {
  path: string,
  content: string,
};

export type AnalyserConfig = {
  name: string,
  version: string,

  // script + interpreter OR...
  script?: string,
  interpreter?: string,
  // it's a bin
  bin?: string,

  configFiles?: Array<string>,
};

export type AnalyserFromManager = {
  path: string,
  config: AnalyserConfig,
};

/**
 * analysers contain all the data required to run a
 * given analyser
 */
export type Analyser = AnalyserConfig & {
  path: string,
}

export type RunnableAnalyser = Analyser & {
  command: string,
  configJSON: string,
};

/**
 * a set of languages and their analysers
 */
export type AnalyserLanguageSet = {
  [languageId: string]: Array<Analyser>,
};


export type Target = GitTarget;

export type GitTarget = {
  path: string,
  compare?: string,
  versus?: string,
  type: "git"
};


/**
 * value object describing an execution plan
 */
export type Plan = {
  perFileTasks: () => Array<SingleFileTask>,
};

/**
 * output by planning modules, ready to be turned in a Plan for
 * consumption by the rest of the system
 */
export type RawPlan = {
  byLanguage: {
    [languageName: string]: {
      analysers: Array<Analyser | RunnableAnalyser>,
      paths: Array<string>,
    },
  },
};

/**
 * value object describing the configuration of an analysis target - e.g a repo
 */
export type RepoConfig = {
  languages: () => Array<string>
}


// the information required to create a plan
export type PlanSource = { target: GitTarget, repo: Repo, repoConfig: RepoConfig };

// will be an enum eventually
export type PlanTask = SingleFileTask;

export type SingleFileTask = {
  analysers: Array<Analyser>,
  path: string,
};

export type AnalysisSessionSetup = {
  analysisSetup: AnalysisSetup,
};

export type AnalysisState = {
  [path: string]: {
    [analyserId: string]: Array<Issue> | Error 
  }
};

export type Issue = {
  analyser: Analyser,
  location: { startLine: number },
};


export type Analysis = {
};


export type AnalysisSetup = {
  repo: Repo,
  plan: Plan,
}
