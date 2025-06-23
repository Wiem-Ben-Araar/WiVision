// src/app/api/wasm/[...path]/route.ts
import { NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

export async function GET({ params }: { params: { path: string[] } }) {
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