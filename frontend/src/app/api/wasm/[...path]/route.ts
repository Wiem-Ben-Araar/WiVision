// src/app/api/wasm/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Extraire le chemin des paramètres de l'URL
  const path = request.nextUrl.pathname.replace('/api/wasm/', '').split('/').filter(Boolean);
  
  // Vérifier qu'on a bien un nom de fichier
  if (path.length === 0) {
    return new NextResponse('File name required', { status: 400 });
  }
  
  const filePath = join(process.cwd(), 'public', 'wasm', ...path);
  
  try {
    await stat(filePath);
    const file = await readFile(filePath);
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error serving WASM file:', error);
    return new NextResponse('WASM file not found', { status: 404 });
  }
}