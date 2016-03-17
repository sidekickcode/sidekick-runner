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

