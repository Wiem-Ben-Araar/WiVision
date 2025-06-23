import { NextRequest } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';

export const dynamic = 'force-static';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Await the params object
  const resolvedParams = await params;
  const filePath = join(process.cwd(), 'public', 'wasm', ...resolvedParams.path);
  
  try {
    await stat(filePath);
    const file = await readFile(filePath);
    
    return new Response(file, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch {
    return new Response('WASM file not found', { status: 404 });
  }
}