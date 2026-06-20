/**
 * fix-aliases.js
 * Run after tsc: replaces @/ aliases in dist with relative paths
 */
const fs = require('fs');
const path = require('path');
const distDir = path.join(__dirname, 'dist');

function getAllJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getAllJsFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Match require('@/...') and from '@/...'
  content = content.replace(/require\(['"]@\/([^'"]+)['"]\)/g, (match, p1) => {
    const rel = path.relative(path.dirname(filePath), path.join(distDir, p1))
      .replace(/\\/g, '/');
    const fixed = rel.startsWith('.') ? rel : './' + rel;
    return `require('${fixed}')`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

const files = getAllJsFiles(distDir);
let count = 0;
for (const f of files) {
  if (fixFile(f)) count++;
}
console.log(`✅ Fixed aliases in ${count}/${files.length} files`);
