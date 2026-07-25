const fs = require('fs');
const file = 'src/data/students.ts';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/branch:\s*'EE\/EEE'/g, "branch: 'EE'");
data = data.replace(/branch:\s*'EEE'/g, "branch: 'EE'");
fs.writeFileSync(file, data, 'utf8');
console.log('Done replacing branches');
