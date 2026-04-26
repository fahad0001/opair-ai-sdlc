#!/usr/bin/env node
import { Command } from "commander";
const p = new Command();
p.name("__projectName__")
  .version("0.1.0")
  .action(() => console.log("hello from __projectName__"));
p.parse();
