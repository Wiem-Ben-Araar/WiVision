// app/api/wasm/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    
    // Adjust this path to where your WASM files are located
    const wasmFilePath = path.join(process.cwd(), 'public', 'wasm', filePath);
    
    if (!fs.existsSync(wasmFilePath)) {
      return new NextResponse('WASM file not found', { status: 404 });
    }

    const wasmBuffer = fs.readFileSync(wasmFilePath);
    
    return new NextResponse(wasmBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving WASM file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;