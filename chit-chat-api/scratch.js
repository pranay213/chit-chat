const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

let loggerUsage = [];
walkDir('./src', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /logger\.(info|warn|error|debug)\(([`'"])(.*?)\2\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    loggerUsage.push({ file: filePath, type: match[1], quote: match[2], text: match[3] });
  }
});
console.log(JSON.stringify(loggerUsage, null, 2));
