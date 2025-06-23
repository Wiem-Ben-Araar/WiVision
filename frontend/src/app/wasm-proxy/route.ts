// app/api/wasm/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export const dynamic = 'force-static';
export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  // Chemin correct vers les fichiers WASM
  const filePath = join(process.cwd(), 'public', 'wasm', ...params.path);
  
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