#!/usr/bin/env node

if(process.env.EXIT_WITH_ERROR_CODE) {
  process.exit(Number(process.env.EXIT_WITH_ERROR_CODE));
}

if(process.env.EMIT_NON_JSON) {
  console.log("not json");
}

if(process.env.NO_OUTPUT) {
  process.exit(0);
}

