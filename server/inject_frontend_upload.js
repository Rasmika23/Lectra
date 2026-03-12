const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'ModuleManagementPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Chunk 1
const target1 = `  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);`;
const replacement1 = `  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');`;

content = content.replace(target1, replacement1);

// Chunk 2
const target2 = `  const handleSaveSettings = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };`;
const replacement2 = `  const handleSaveSettings = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUploadTimetable = async () => {
    if (!timetableFile || !selectedModule) return;
    
    setIsUploading(true);
    setUploadMessage('');
    
    try {
      const formData = new FormData();
      formData.append('timetable', timetableFile);
      
      const response = await fetch(\`http://localhost:5000/modules/\${selectedModule}/timetable\`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUploadMessage('Timetable uploaded successfully!');
        setTimetableFile(null); // Reset the file picker
      } else {
        setUploadMessage(data.error || 'Failed to upload timetable');
      }
    } catch (err) {
      console.error(err);
      setUploadMessage('Network error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };`;

content = content.replace(target2, replacement2);

// Chunk 3
const target3 = `              {timetableFile && (
                <div className="mt-[var(--space-md)]">
                  <Button variant="primary" size="md">
                    Process & Validate Timetable
                  </Button>
                </div>
              )}
              
              <div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[#DBEAFE] rounded-lg">`;
const replacement3 = `              {timetableFile && (
                <div className="mt-[var(--space-md)]">
                  <Button variant="primary" size="md" onClick={handleUploadTimetable} disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Process & Validate Timetable'}
                  </Button>
                </div>
              )}
              
              {uploadMessage && (
                <div className={\`mt-[var(--space-md)] p-[var(--space-sm)] rounded-lg text-[var(--font-size-small)] font-medium \${uploadMessage.includes('successfully') ? 'text-[var(--color-success)] bg-[#D1FAE5]' : 'text-[var(--color-error)] bg-[#FEE2E2]'}\`}>
                  {uploadMessage}
                </div>
              )}

              <div className="mt-[var(--space-lg)] p-[var(--space-lg)] bg-[#DBEAFE] rounded-lg">`;

content = content.replace(target3, replacement3);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Frontend upload logic injected successfully.');
