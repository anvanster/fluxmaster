#!/usr/bin/env node
import { initLogger } from '@fluxmaster/core';
import { createApp } from './app.js';

initLogger('warn', 'stderr');

const program = createApp();
program.parseAsync(process.argv);
