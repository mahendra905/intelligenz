import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileImage,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface ImageUploaderProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  onFileSelect?: (file: File | null) => void;
  label?: string;
  required?: boolean;
  aspectRatio?: 'video' | 'banner' | 'square' | 'auto';
  category?: 'events' | 'gallery' | 'team' | 'projects' | string;
  className?: string;
  helpText?: string;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  onFileSelect,
  label = 'Image Upload',
  required = false,
  aspectRatio = 'auto',
  category = 'media',
  className = '',
  helpText,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    sizeFormatted: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!file) return 'No file selected.';

    // Size validation
    if (file.size > MAX_SIZE_BYTES) {
      return 'Image size must be 50 MB or less.';
    }

    // Type validation
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!isValidMime && !isValidExt) {
      return 'Please upload a JPG, JPEG, PNG, or WEBP image.';
    }

    return null;
  };

  const handleProcessFile = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileDetails({
      name: file.name,
      sizeFormatted: formatFileSize(file.size),
    });

    if (onFileSelect) {
      onFileSelect(file);
    }

    // Upload to server persistently
    setIsUploading(true);
    try {
      const res = await api.uploadImage(file, category);
      onChange(res.url);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      const msg = err.message || 'Image upload failed. Please try again.';
      setUploadError(msg);
      setFileDetails(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  }, [disabled, isUploading]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setFileDetails(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  };

  const handleTriggerBrowse = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Determine aspect ratio class for preview container
  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'aspect-[21/9] sm:aspect-[16/7]';
      case 'video':
        return 'aspect-video';
      case 'square':
        return 'aspect-square max-w-[200px] mx-auto';
      default:
        return 'max-h-72 min-h-[160px]';
    }
  };

  const hasImage = Boolean(value && value.trim().length > 0);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label and Status */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#D1D5DB]">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {helpText && (
          <span className="text-[11px] text-[#6B7280]">{helpText}</span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        className="hidden"
        id={`file-input-${category}-${label.replace(/\s+/g, '-').toLowerCase()}`}
        aria-label={label}
      />

      {/* Main Container */}
      {!hasImage ? (
        /* Default Dropzone State */
        <div
          onClick={handleTriggerBrowse}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTriggerBrowse();
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center group select-none ${
            isDragging
              ? 'border-[#00E5FF] bg-[#00E5FF]/10 scale-[1.01]'
              : 'border-[#1A1C23] hover:border-[#00E5FF]/50 bg-[#0A0B0E] hover:bg-[#0D1017]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Uploading image...</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Encrypting and writing to persistent storage</p>
              </div>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center space-y-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isDragging
                    ? 'bg-[#00E5FF] text-[#0A0B0E]'
                    : 'bg-[#141824] text-[#00E5FF] group-hover:scale-110 group-hover:bg-[#00E5FF]/10'
                }`}
              >
                {isDragging ? (
                  <UploadCloud className="w-7 h-7 animate-bounce" />
                ) : (
                  <ImageIcon className="w-7 h-7" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {isDragging ? 'Drop Image Here' : 'Drag & Drop Your Image'}
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  or <span className="text-[#00E5FF] font-medium group-hover:underline">Browse Files</span>
                </p>
              </div>

              <div className="pt-2 flex flex-col items-center text-[11px] text-[#6B7280] space-y-0.5">
                <span className="font-mono tracking-wider font-semibold text-[#9CA3AF]">PNG • JPG • JPEG • WEBP</span>
                <span>Maximum 50 MB</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Image Preview State */
        <div className="rounded-2xl bg-[#0D1017] border border-[#1A1C23] overflow-hidden group/preview relative transition-all">
          <div className={`relative w-full ${getAspectClass()} overflow-hidden bg-[#0A0B0E] flex items-center justify-center`}>
            <img
              src={value}
              alt="Uploaded preview"
              className="w-full h-full object-contain max-h-[360px] transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                // Fallback placeholder if image load fails
                (e.target as HTMLElement).classList.add('opacity-30');
              }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-end justify-between p-4 pointer-events-none" />

            {/* Top Right Quick Delete */}
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled || isUploading}
              aria-label="Remove image"
              title="Remove image"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-lg active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Uploading Overlay during image replacement */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
                <p className="text-xs font-semibold text-white">Replacing image...</p>
              </div>
            )}
          </div>

          {/* Details Bar & Change Button */}
          <div className="p-3.5 bg-[#0D1017] border-t border-[#1A1C23] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#141824] flex items-center justify-center shrink-0 text-[#00E5FF]">
                <FileImage className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate" title={fileDetails?.name || value}>
                  {fileDetails?.name || (value && value.startsWith('/uploads/') ? value.replace('/uploads/', '') : (value || '').slice(0, 35) + '...')}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                  {fileDetails?.sizeFormatted ? (
                    <span>{fileDetails.sizeFormatted}</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Stored
                    </span>
                  )}
                  <span>•</span>
                  <span className="text-[#9CA3AF]">Persistent Storage</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTriggerBrowse}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-lg bg-[#1A1C23] hover:bg-[#2A2E3D] text-xs font-medium text-white transition-all flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Change Image</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 transition-all active:scale-95"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Image uploaded and saved to persistent storage.</span>
        </div>
      )}
    </div>
  );
};
