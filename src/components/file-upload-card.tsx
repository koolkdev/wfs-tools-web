import { CheckCircle2, FileIcon, KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FileUploadCardProps {
  title: string;
  file: File | null;
  isKey: boolean;
  getRootProps: any;
  getInputProps: any;
  disabled?: boolean;
}

export function FileUploadCard({
  title,
  file,
  isKey,
  getRootProps,
  getInputProps,
  disabled = false,
}: FileUploadCardProps) {
  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-all duration-300 h-full cursor-pointer rounded-md ',
        disabled
          ? 'opacity-50 border-muted cursor-not-allowed'
          : file
          ? 'border-emerald-500 dark:border-green-700'
          : 'border-primary hover:border-primary/80',
        !disabled && 'hover:bg-muted/50',
      )}
      {...(disabled ? {} : getRootProps())}
    >
      <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full">
        {!disabled && <input {...getInputProps()} />}

        {file ? (
          <CheckCircle2
            className={`h-7 w-7 mb-2 ${
              disabled ? 'text-gray-400' : 'text-emerald-500 dark:text-green-700'
            }`}
          />
        ) : isKey ? (
          <KeyRound className={`h-7 w-7 mb-2 ${disabled ? 'text-gray-400' : 'text-blue-500'}`} />
        ) : (
          <FileIcon className={`h-7 w-7 mb-2 ${disabled ? 'text-gray-400' : 'text-blue-500'}`} />
        )}

        <p
          className={cn(
            'text-sm truncate max-w-full',
            disabled
              ? 'text-muted-foreground'
              : file
              ? 'text-emerald-700 dark:text-green-500 font-medium'
              : 'text-foreground',
          )}
        >
          {file ? file.name : title}
        </p>
      </CardContent>
    </Card>
  );
}
