# Runner

[![Build Status](https://travis-ci.org/sidekickcode/sidekick-runner.svg?branch=master)](https://travis-ci.org/sidekickcode/sidekick-runner)

Runs multiple sidekick-compatible analysers over your source code!

## Installation

```sh
npm install --save @sidekick/runner
```

## Usage

```sh
var runner = require("@sidekick/runner").create(setup);

runner.run()
.then((result) => {
  console.log("sidekick output: " + result);
});
```

## Architecture

First what do we want to analyse? This is the Target. Let's assume it's a git repo, so our target is: `{ path: "/some/repo", beforeId: "someSha", afterId: "someSha" }`.

We provide the Target to a Planner, which creates an AnalysisPlan.

With the plan we can go to the Runner, which takes a Plan and runs it. The Runner emits events as the analysis progresses, and can be interacted with (to ask for re-analysis, to cancel the analysis, etc).

### Shell vs values

The Shell is everything that orchestrates, configures or represents and stores run-time state (e.g have
we started? What's the status?).

```sh
Shell       |  Values
------------|-----------------------
            |
            |  Target
Planner     |  Plan
Runner      |  Meta, Errors, Events
Session     |
```

