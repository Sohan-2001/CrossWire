import { File, FileText, Image, Video, AudioLines, Archive, Code } from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
  // Documents
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  // Images
  jpg: Image,
  jpeg: Image,
  png: Image,
  gif: Image,
  svg: Image,
  webp: Image,
  // Videos
  mp4: Video,
  mov: Video,
  avi: Video,
  // Audio
  mp3: AudioLines,
  wav: AudioLines,
  // Archives
  zip: Archive,
  rar: Archive,
  '7z': Archive,
  // Code
  js: Code,
  jsx: Code,
  ts: Code,
  tsx: Code,
  html: Code,
  css: Code,
  json: Code,
  py: Code,
};

export function FileIcon({ filename }: { filename: string }) {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const IconComponent = iconMap[extension] || File;

  return <IconComponent className="h-6 w-6 text-muted-foreground" />;
}
