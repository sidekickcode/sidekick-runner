#!/usr/bin/env node


console.log(JSON.stringify({
  userErrors: [
    {
      message: "fail",
      kind: "a",
    },
  ],
}))

process.exit(0);
