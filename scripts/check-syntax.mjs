import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, 'long-polling.cjs');
const src = readFileSync(filePath, 'utf8');
const lines = src.split('\n');

let braces = 0;
let parens = 0;
let brackets = 0;
let inSingleQuote = false;
let inDoubleQuote = false;
let inTemplate = 0; // depth
let templateStack = []; // track template nesting
let inLineComment = false;
let inBlockComment = false;

const issues = [];

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  inLineComment = false;

  for (let ci = 0; ci < line.length; ci++) {
    const ch = line[ci];
    const next = line[ci + 1];

    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; ci++; }
      continue;
    }
    if (inLineComment) break;

    if (inSingleQuote) {
      if (ch === '\\') { ci++; continue; }
      if (ch === "'") inSingleQuote = false;
      continue;
    }
    if (inDoubleQuote) {
      if (ch === '\\') { ci++; continue; }
      if (ch === '"') inDoubleQuote = false;
      continue;
    }
    if (inTemplate > 0) {
      if (ch === '\\') { ci++; continue; }
      if (ch === '`') {
        inTemplate--;
        templateStack.pop();
        continue;
      }
      if (ch === '$' && next === '{') {
        templateStack.push({ li, ci });
        braces++;
        ci++;
        continue;
      }
      continue;
    }

    if (ch === '/' && next === '/') { inLineComment = true; break; }
    if (ch === '/' && next === '*') { inBlockComment = true; ci++; continue; }
    if (ch === "'") { inSingleQuote = true; continue; }
    if (ch === '"') { inDoubleQuote = true; continue; }
    if (ch === '`') { inTemplate++; templateStack.push({ li, ci }); continue; }

    if (ch === '{') { braces++; }
    else if (ch === '}') {
      braces--;
      if (braces < 0) { issues.push(`Line ${li+1}: unexpected }`); braces = 0; }
    }
    else if (ch === '(') parens++;
    else if (ch === ')') {
      parens--;
      if (parens < 0) { issues.push(`Line ${li+1}: unexpected )`); parens = 0; }
    }
    else if (ch === '[') brackets++;
    else if (ch === ']') {
      brackets--;
      if (brackets < 0) { issues.push(`Line ${li+1}: unexpected ]`); brackets = 0; }
    }
  }
}

console.log('=== Syntax Balance Check ===');
console.log(`Total lines: ${lines.length}`);
console.log(`Braces {}: ${braces}`);
console.log(`Parens (): ${parens}`);
console.log(`Brackets []: ${brackets}`);
console.log(`Template literals open: ${inTemplate}`);
if (inSingleQuote) console.log('WARNING: file ends inside single-quote string');
if (inDoubleQuote) console.log('WARNING: file ends inside double-quote string');
if (inTemplate > 0) {
  console.log('WARNING: unclosed template literal(s):');
  templateStack.forEach(t => console.log(`  opened at line ${t.li+1}, col ${t.ci+1}`));
}
if (issues.length) {
  console.log('\nIssues found:');
  issues.forEach(i => console.log(' ', i));
} else {
  console.log('\nNo immediate bracket issues found.');
}
