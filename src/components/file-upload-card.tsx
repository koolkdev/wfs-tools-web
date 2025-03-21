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
        'border-2 border-dashed transition-all duration-300 h-full',
        disabled
          ? 'opacity-50 border-muted'
          : file
          ? 'border-green-500'
          : 'border-primary hover:border-primary/80',
      )}
    >
      <div
        {...getRootProps()}
        className={cn('h-full w-full cursor-pointer rounded-md', disabled && 'cursor-not-allowed')}
      >
        <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
          <input {...getInputProps()} />

          {file ? (
            <CheckCircle2 className="h-7 w-7 mb-2" color={disabled ? 'gray' : 'green'} />
          ) : isKey ? (
            <KeyRound className="h-7 w-7 mb-2" color={disabled ? 'gray' : '#0072CE'} />
          ) : (
            <FileIcon className="h-7 w-7 mb-2" color={disabled ? 'gray' : '#0072CE'} />
          )}

          <p
            className={cn(
              'text-sm truncate max-w-full',
              disabled
                ? 'text-muted-foreground'
                : file
                ? 'text-green-700 dark:text-green-500 font-medium'
                : 'text-foreground',
            )}
          >
            {file ? file.name : title}
          </p>
        </CardContent>
      </div>
    </Card>
  );
}
