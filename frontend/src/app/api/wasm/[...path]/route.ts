// app/api/wasm/[...path]/route.ts
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(

  context: RouteParams
) {
  try {
    const params = await context.params;
    const path = params.path.join('/');
    const filePath = join(process.cwd(), 'public', 'wasm', path);
    
    const fileBuffer = readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('WASM file not found:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}