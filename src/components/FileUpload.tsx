import React, { useRef, useState } from 'react';
import { Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
  onChange?: (file: File | null) => void;
  helperText?: string;
  error?: string;
}

export function FileUpload({
  label,
  accept,
  maxSize = 10,
  onChange,
  helperText,
  error,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }
    setSelectedFile(file);
    onChange?.(file);
  };
  
  const handleRemove = () => {
    setSelectedFile(null);
    onChange?.(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };
  
  return (
    <div className="flex flex-col gap-[var(--space-sm)] w-full">
      {label && (
        <label className="text-[var(--font-size-small)] font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-[var(--space-xl)]
          transition-all duration-200 cursor-pointer
          ${dragActive 
            ? 'border-[var(--color-primary)] bg-[#E0F2FE]' 
            : error
            ? 'border-[var(--color-error)] bg-[#FEF2F2]'
            : 'border-[#CBD5E1] bg-[var(--color-bg-sidebar)] hover:border-[var(--color-primary)]'
          }
        `}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          aria-label={label || 'File upload'}
        />
        
        {selectedFile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[var(--space-md)]">
              <File className="w-8 h-8 text-[var(--color-primary)]" />
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">{selectedFile.name}</p>
                <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="p-1 rounded-lg hover:bg-[var(--color-bg-main)] transition-colors"
              aria-label="Remove file"
            >
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <Upload className="w-12 h-12 text-[var(--color-text-secondary)] mb-[var(--space-md)]" />
            <p className="font-medium text-[var(--color-text-primary)] mb-[var(--space-xs)]">
              Click to upload or drag and drop
            </p>
            <p className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
              {accept ? `Accepted formats: ${accept}` : 'Any file format'}
              {maxSize && ` (Max size: ${maxSize}MB)`}
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <span className="text-[var(--font-size-small)] text-[var(--color-error)]" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="text-[var(--font-size-small)] text-[var(--color-text-secondary)]">
          {helperText}
        </span>
      )}
    </div>
  );
}
