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

let responses = [];
walkDir('./src/controllers', (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match successResponse(res, 200, 'Some string', ...) or errorResponse(...)
  const regex = /(successResponse|errorResponse)\(res,\s*\d+,\s*([`'"])(.*?)\2/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!match[3].startsWith('SuccessMessages.') && !match[3].startsWith('ErrorMessages.')) {
       responses.push({ file: filePath, type: match[1], quote: match[2], text: match[3] });
    }
  }
});
console.log(JSON.stringify(responses, null, 2));
