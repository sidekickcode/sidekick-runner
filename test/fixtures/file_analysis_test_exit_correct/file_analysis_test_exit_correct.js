#!/usr/bin/env node


console.log(JSON.stringify({
  meta: [
    {
      analyser: "test",
      version: "1",
      location: {},
      message: "hi",
      kind: "a",
    },
  ],
}))

process.exit(0);
