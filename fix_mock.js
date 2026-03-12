const fs = require('fs');
const p = 'src/pages/ModuleManagementPage.tsx';
let c = fs.readFileSync(p, 'utf8');

const target = `  const module = mockModules.find(m => m.id === selectedModule);
  
  const moduleOptions = mockModules.map(m => ({
    value: m.id,
    label: \`\${m.code} - \${m.name}\`
  }));`;

const replacement = `  const module = modules.find(m => m.moduleid === selectedModule);
  
  const moduleOptions = modules.map(m => ({
    value: m.moduleid,
    label: \`\${m.modulecode} - \${m.modulename} (Yr \${m.academicyear}, Sem \${m.semester})\`
  }));`;

if (c.includes('mockModules.find')) {
  c = c.replace(target, replacement);
  fs.writeFileSync(p, c, 'utf8');
  console.log('Fixed mockModules references.');
} else {
  console.log('Already fixed or target string not exact.');
}
