const fs = require('fs');
const lines = fs.readFileSync('logcat2.txt', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('FATAL') || line.includes('Exception') || line.includes('Error:') || line.includes('crash')) {
    console.log(`Line ${i}: ${line.trim()}`);
  }
}
