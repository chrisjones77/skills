import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {SKILL_ROOT} from './lib/profiles.mjs';
const root=path.resolve(SKILL_ROOT,'../..');
async function tests(dir){const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())result.push(...await tests(p));else if(e.name.endsWith('.test.mjs'))result.push(p);}return result;}
try{const files=await tests(path.join(root,'tests'));const child=spawn(process.execPath,['--test','--test-concurrency=1',...files],{cwd:root,stdio:'inherit',env:process.env});child.on('exit',code=>process.exitCode=code??1);}catch(e){console.error('Repository tests require the full retro-dtp checkout. The standalone package supports doctor, prepare, render and verify. '+e.message);process.exitCode=2;}
