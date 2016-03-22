// @flow

export type Repo = { file: ((path: string) => string) };
export type Analyser = { command: string, interpreter: string, configFiles: Array<string> };
export type RunnerConfig = { analysers: Array<Analyser>, target: Target, config: Object, repo?: Repo };

export type Target = GitTarget;
export type GitTarget = { path: string, compare?: string, versus?: string, type: "git" };
