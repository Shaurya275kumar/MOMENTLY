import { supabase } from './supabase';

export async function uploadFile(bucket: string, file: File, pathPrefix: string) {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
