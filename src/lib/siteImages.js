import { supabase } from './supabase.js';

const BUCKET = 'site-images';

// Draws the image onto a canvas no wider than maxW and returns a compressed JPEG blob
function compress(src, maxW) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('That image could not be read. Try a JPG or PNG.'));
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not compress the image.'))), 'image/jpeg', 0.85);
    };
    img.src = src;
  });
}

// Compresses an image (a File or a data: URL) and uploads it. Returns the public link.
export async function uploadSiteImage(source, folder = 'events', maxW = 1600) {
  let src = source;
  let revoke = null;
  if (source instanceof Blob) { src = URL.createObjectURL(source); revoke = src; }
  try {
    const blob = await compress(src, maxW);
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg', cacheControl: '31536000', upsert: false,
    });
    if (error) throw new Error(error.message);
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } finally {
    if (revoke) URL.revokeObjectURL(revoke);
  }
}

export const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
