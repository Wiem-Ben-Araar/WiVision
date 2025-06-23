// app/wasm/[...path]/route.ts
import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export const dynamic = 'force-static';

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const filePath = join(process.cwd(), 'public', 'wasm', ...params.path);
  
  try {
    await stat(filePath); // Vérifie que le fichier existe
    
    const file = await readFile(filePath);
    const headers = new Headers();
    
    // Headers essentiels pour WASM
    headers.set('Content-Type', 'application/wasm');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    return new Response(file, { headers });
  } catch (error) {
    return new Response('WASM file not found', { status: 404 });
  }
}