const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'ModuleManagementPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. imports
content = content.replace(
  "import React, { useState } from 'react';", 
  "import React, { useState, useEffect } from 'react';"
);

// 2. State & useEffect
const stateTarget = `  const [selectedModule, setSelectedModule] = useState(mockModules[0].id);`;
const stateReplacement = `  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/modules')
      .then(res => res.json())
      .then(data => {
        setModules(data);
        if (data.length > 0) setSelectedModule(data[0].moduleid);
      })
      .catch(console.error);
  }, []);`;
content = content.replace(stateTarget, stateReplacement);

// 3. module references
const modTarget = `  const module = mockModules.find(m => m.id === selectedModule);
  
  const moduleOptions = mockModules.map(m => ({
    value: m.id,
    label: \`\${m.code} - \${m.name}\`
  }));`;

const modReplacement = `  const module = modules.find(m => m.moduleid === selectedModule);
  
  const moduleOptions = modules.map(m => ({
    value: m.moduleid,
    label: \`\${m.modulecode} - \${m.modulename} (Yr \${m.academicyear}, Sem \${m.semester})\`
  }));`;
content = content.replace(modTarget, modReplacement);

// 4. the UI fields
content = content.replace('{module.academicYear}', '{module.academicyear}');
content = content.replace('{module.subCoordinator || \'Not assigned\'}', '{module.subcoordinator || \'Not assigned\'}');
content = content.replace('{module.lecturers.length > 0 && (', '{module.lecturers && module.lecturers.length > 0 && (');
content = content.replace('{module.lecturers.length}', '{module.lecturers ? module.lecturers.length : 0}');
content = content.replace('{module.lecturers.map', '{(module.lecturers || []).map');


fs.writeFileSync(filePath, content, 'utf8');
console.log('Frontend fetch logic injected successfully.');
