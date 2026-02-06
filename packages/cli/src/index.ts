#!/usr/bin/env node
import { createApp } from './app.js';

const program = createApp();
program.parseAsync(process.argv);
