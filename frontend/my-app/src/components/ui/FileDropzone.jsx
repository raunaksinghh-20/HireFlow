import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, FileText } from 'lucide-react';

export default function FileDropzone({ onDrop, isUploading, accept = { 'application/pdf': ['.pdf'] }, maxFiles = 1, label = "Drop file here" }) {
  const handleDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      onDrop(acceptedFiles);
    }
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxFiles,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-neutral-200' : 'border-neutral-300 hover:border-primary hover:bg-neutral-50'
      }`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="font-bold font-display text-sm uppercase tracking-widest">Processing...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Upload className={`w-8 h-8 mb-3 ${isDragActive ? 'text-primary' : 'text-neutral-400'}`} />
          <p className="font-bold text-primary text-sm">{isDragActive ? "Drop it!" : label}</p>
          <p className="text-xs text-neutral-500 mt-2">or click to browse</p>
          
          {acceptedFiles.length > 0 && maxFiles === 1 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary bg-white px-3 py-1.5 rounded-md shadow-flat-sm border border-neutral-200">
              <FileText className="w-4 h-4" /> {acceptedFiles[0].name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
