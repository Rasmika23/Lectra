const fs = require('fs');
const p = 'src/pages/ModuleManagementPage.tsx';
let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

// 1. replace imports 
lines = lines.map(l => l.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';"));

// 2. replace state definition block
const stateIdx = lines.findIndex(l => l.includes('const [selectedModule, setSelectedModule] = useState(mockModules[0].id);'));
if(stateIdx > -1) {
  const replacementLines = [
    '  const [modules, setModules] = useState<any[]>([]);',
    '  const [selectedModule, setSelectedModule] = useState(\'\');',
    '',
    '  useEffect(() => {',
    '    fetch(\'http://localhost:5000/modules\')',
    '      .then(res => res.json())',
    '      .then(data => {',
    '        setModules(data);',
    '        if (data.length > 0) setSelectedModule(data[0].moduleid);',
    '      })',
    '      .catch(console.error);',
    '  }, []);'
  ];
  lines.splice(stateIdx, 1, ...replacementLines);
}

// 3. upload mechanism states
const uploadStateIdx = lines.findIndex(l => l.includes('const [showSuccess, setShowSuccess] = useState(false);'));
if(uploadStateIdx > -1) {
  lines.splice(uploadStateIdx + 1, 0, '  const [isUploading, setIsUploading] = useState(false);', '  const [uploadMessage, setUploadMessage] = useState(\'\');');
}

// 4. replace the mockModules mapping
const mapIdx = lines.findIndex(l => l.includes('const module = mockModules.find(m => m.id === selectedModule);'));
if (mapIdx > -1) {
  // remove next 6 lines
  lines.splice(mapIdx, 6, 
    '  const module = modules.find(m => m.moduleid === selectedModule);',
    '  ',
    '  const moduleOptions = modules.map(m => ({',
    '    value: m.moduleid,',
    '    label: `${m.modulecode} - ${m.modulename} (Yr ${m.academicyear}, Sem ${m.semester})`',
    '  }));'
  );
}

// 5. the upload fetch handler (find handleSaveSettings and insert after)
const saveSettingsIdx = lines.findIndex(l => l.includes('const handleSaveSettings = () => {'));
if (saveSettingsIdx > -1) {
  const handleUpload = [
    '  const handleUploadTimetable = async () => {',
    '    if (!timetableFile || !selectedModule) return;',
    '    ',
    '    setIsUploading(true);',
    '    setUploadMessage(\'\');',
    '    ',
    '    try {',
    '      const formData = new FormData();',
    '      formData.append(\'timetable\', timetableFile);',
    '      ',
    '      const response = await fetch(`http://localhost:5000/modules/${selectedModule}/timetable`, {',
    '        method: \'POST\',',
    '        body: formData,',
    '      });',
    '      ',
    '      const data = await response.json();',
    '      ',
    '      if (response.ok) {',
    '        setUploadMessage(\'Timetable uploaded successfully!\');',
    '        setTimetableFile(null); // Reset the file picker',
    '      } else {',
    '        setUploadMessage(data.error || \'Failed to upload timetable\');',
    '      }',
    '    } catch (err) {',
    '      console.error(err);',
    '      setUploadMessage(\'Network error occurred during upload\');',
    '    } finally {',
    '      setIsUploading(false);',
    '    }',
    '  };'
  ];
  // find the end of handleSaveSettings (which is 3 lines down)
  lines.splice(saveSettingsIdx + 4, 0, ...handleUpload);
}

// 6. Fix lowercase DB column references in UI loop
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('module.academicYear')) lines[i] = lines[i].replace('module.academicYear', 'module.academicyear');
  if (lines[i].includes('module.semester')) lines[i] = lines[i].replace('module.semester', 'module.semester'); // same
  if (lines[i].includes("module.subCoordinator || 'Not assigned'")) lines[i] = lines[i].replace("module.subCoordinator || 'Not assigned'", "module.subcoordinator || 'Not assigned'");
  if (lines[i].includes('module.lecturers.length > 0 && (')) lines[i] = lines[i].replace('module.lecturers.length > 0 && (', 'module.lecturers && module.lecturers.length > 0 && (');
  if (lines[i].includes('module.lecturers.length)')) lines[i] = lines[i].replace('module.lecturers.length)', '(module.lecturers ? module.lecturers.length : 0))');
  if (lines[i].includes('module.lecturers.map')) lines[i] = lines[i].replace('module.lecturers.map', '(module.lecturers || []).map');
  
  // Replace the button JSX
  if (lines[i].includes('<Button variant="primary" size="md">') && lines[i+1].includes('Process & Validate Timetable')) {
    lines.splice(i, 3, 
      '                  <Button variant="primary" size="md" onClick={handleUploadTimetable} disabled={isUploading}>',
      '                    {isUploading ? \'Uploading...\' : \'Process & Validate Timetable\'}',
      '                  </Button>'
    );
  }
}

// 7. Insert the uploadMessage div above the info box
const infoBoxIdx = lines.findIndex(l => l.includes('<div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[#DBEAFE] rounded-lg">'));
if (infoBoxIdx > -1) {
  const msgBox = [
    '              {uploadMessage && (',
    '                <div className={`mt-[var(--space-md)] p-[var(--space-sm)] rounded-lg text-[var(--font-size-small)] font-medium ${uploadMessage.includes(\'successfully\') ? \'text-[var(--color-success)] bg-[#D1FAE5]\' : \'text-[var(--color-error)] bg-[#FEE2E2]\'}`}>',
    '                  {uploadMessage}',
    '                </div>',
    '              )}',
    '              '
  ];
  lines.splice(infoBoxIdx, 0, ...msgBox);
}

// 8. write it all back
fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Successfully completed full component replacement in one sweep!');
