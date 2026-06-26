const fs = require('fs');
const lines = fs.readFileSync('logcat2.txt', 'utf8').split('\n');
let out = '';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('FATAL') || line.includes('Exception') || line.includes('Error:') || line.includes('crash')) {
    out += `Line ${i}: ${line.trim()}\n`;
  }
}
fs.writeFileSync('errors-utf8.txt', out, 'utf8');
