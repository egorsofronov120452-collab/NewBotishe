const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'long-polling.cjs');
const src = fs.readFileSync(filePath, 'utf8');

// Try to detect unbalanced constructs by scanning character by character
let braces = 0, parens = 0, brackets = 0;
let inSingleStr = false, inDoubleStr = false, inTemplate = false;
let templateDepth = 0;
let inLineComment = false, inBlockComment = false;
let line = 1;
let lastBraceOpen = 0;

for (let i = 0; i < src.length; i++) {
  const c = src[i];
  const next = src[i + 1];

  if (c === '\n') { line++; inLineComment = false; }

  if (inLineComment) continue;
  if (inBlockComment) {
    if (c === '*' && next === '/') { inBlockComment = false; i++; }
    continue;
  }

  if (!inSingleStr && !inDoubleStr && !inTemplate) {
    if (c === '/' && next === '/') { inLineComment = true; continue; }
    if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }
  }

  if (c === '\\' && (inSingleStr || inDoubleStr || inTemplate)) { i++; continue; }

  if (!inDoubleStr && !inTemplate && c === "'") { inSingleStr = !inSingleStr; continue; }
  if (!inSingleStr && !inTemplate && c === '"') { inDoubleStr = !inDoubleStr; continue; }
  if (!inSingleStr && !inDoubleStr && c === '`') {
    inTemplate = !inTemplate;
    if (inTemplate) templateDepth++;
    else templateDepth--;
    continue;
  }

  if (inSingleStr || inDoubleStr || inTemplate) continue;

  if (c === '{') { braces++; lastBraceOpen = line; }
  if (c === '}') { braces--; if (braces < 0) { console.log(`[v0] Extra } at line ${line}`); braces = 0; } }
  if (c === '(') parens++;
  if (c === ')') { parens--; if (parens < 0) { console.log(`[v0] Extra ) at line ${line}`); parens = 0; } }
  if (c === '[') brackets++;
  if (c === ']') { brackets--; if (brackets < 0) { console.log(`[v0] Extra ] at line ${line}`); brackets = 0; } }
}

console.log(`[v0] Final counts — braces: ${braces}, parens: ${parens}, brackets: ${brackets}, inTemplate: ${inTemplate} (depth: ${templateDepth}), inSingle: ${inSingleStr}, inDouble: ${inDoubleStr}`);
console.log(`[v0] Total lines: ${line}`);
if (braces !== 0) console.log(`[v0] Last { opened around line: ${lastBraceOpen}`);
