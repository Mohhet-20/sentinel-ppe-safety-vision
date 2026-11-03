import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clipboard, FolderOpen, Layers, UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadDropzoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
}

export function UploadDropzone({ accept, multiple = false, label, hint, onFiles }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter((f) => {
        const kind = accept.split("/")[0];
        return f.type.startsWith(kind);
      });
      if (files.length === 0) return;
      onFiles(multiple ? files : [files[0]]);
      toast({
        title: files.length > 1 ? `${files.length} files added` : "File added",
        description: files.length > 1 ? "Batch queued for processing." : files[0].name,
      });
    },
    [accept, multiple, onFiles, toast],
  );

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const kind = accept.split("/")[0];
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith(kind)) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) handleFiles(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept, handleFiles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "hud-panel relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card/60 px-6 py-12 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <motion.div
        animate={dragging ? { scale: 1.08 } : { scale: 1 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
      </motion.div>
      <div>
        <p className="font-display text-sm font-semibold tracking-wide text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Browse files
        </button>
        {multiple && (
          <span className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Batch supported
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground">
          <Clipboard className="h-3.5 w-3.5" /> Ctrl+V to paste
        </span>
      </div>
    </motion.div>
  );
}
