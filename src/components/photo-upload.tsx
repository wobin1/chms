"use client";

import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { useToast } from "@/components/toast";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export function PhotoUpload({
  label,
  entity,
  entityId,
  value,
  onChange,
}: {
  label: string;
  entity: "members" | "church";
  entityId: string;
  value: string;
  onChange: (url: string, publicId?: string) => void;
}) {
  const toast = useToast();
  const inputId = useId();
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File) {
    setUploading(true);
    try {
      const signResponse = await fetch("/api/v1/uploads/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity, entityId }),
      });
      if (!signResponse.ok) {
        throw new Error("Could not start upload");
      }
      const signed = (await signResponse.json()) as {
        signature: string;
        timestamp: number;
        folder: string;
        apiKey: string;
        cloudName: string;
      };
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signed.apiKey);
      body.append("timestamp", String(signed.timestamp));
      body.append("signature", signed.signature);
      body.append("folder", signed.folder);
      const uploaded = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        { method: "POST", body },
      );
      if (!uploaded.ok) {
        throw new Error("Cloudinary upload failed");
      }
      const result = (await uploaded.json()) as {
        secure_url: string;
        public_id: string;
      };
      onChange(result.secure_url, result.public_id);
      toast("success", `${label} uploaded.`);
    } catch (error) {
      toast(
        "error",
        error instanceof Error ? error.message : `Unable to upload ${label.toLowerCase()}.`,
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <label
        htmlFor={inputId}
        className={cn(
          "relative flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-canvas text-text-muted transition hover:border-accent hover:text-accent",
          uploading && "pointer-events-none opacity-80",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus className="h-7 w-7" aria-hidden />
            <span className="mt-1 px-2 text-center text-xs font-medium">
              Choose photo
            </span>
          </>
        )}
        {value ? (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-text/70 py-1 text-[11px] font-medium text-white">
            <Camera className="h-3 w-3" aria-hidden />
            Change
          </span>
        ) : null}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-surface/80">
            <LoaderCircle
              className="h-6 w-6 animate-spin text-accent"
              aria-hidden
            />
            <span className="sr-only">Uploading</span>
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
