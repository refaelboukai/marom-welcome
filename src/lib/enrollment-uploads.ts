import { supabase } from "@/integrations/supabase/client";

export const ENROLLMENT_BUCKET = "enrollment-docs";
export const MAX_UPLOAD_MB = 10;

const sanitize = (name: string) =>
  name.replace(/[^\w.\-]+/g, "_").slice(-60);

/** Upload a document to the private enrollment bucket; returns the storage path. */
export async function uploadEnrollmentDoc(
  file: File,
  fieldKey: string,
  folder: string,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { ok: false, error: `הקובץ גדול מדי (עד ${MAX_UPLOAD_MB}MB)` };
  }
  const path = `${folder || "public"}/${fieldKey}-${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage
    .from(ENROLLMENT_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

/** Create a temporary signed URL for viewing an uploaded document. */
export async function getEnrollmentDocUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ENROLLMENT_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function openEnrollmentDoc(path: string) {
  const url = await getEnrollmentDocUrl(path);
  if (url) window.open(url, "_blank", "noopener");
}

export function fileNameFromPath(path: string) {
  const base = path.split("/").pop() || path;
  return base.replace(/^[\w-]+-\d{10,}-/, "");
}
