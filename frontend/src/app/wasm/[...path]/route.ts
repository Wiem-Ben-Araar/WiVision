// app/wasm/[...path]/route.ts
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export const dynamic = 'force-static';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const filePath = join(process.cwd(), 'public', 'wasm', ...params.path);
  
  try {
    await stat(filePath);
    const file = await readFile(filePath);
    const headers = new Headers();
    
    headers.set('Content-Type', 'application/wasm');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return new Response(file, { headers });
  } catch {
    return new Response('WASM file not found', { status: 404 });
  }
}