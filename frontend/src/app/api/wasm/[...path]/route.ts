// src/app/api/wasm/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const fileName = resolvedParams.path.join('/');
    
    console.log('WASM file requested:', fileName);
    
    // Chemin vers le fichier WASM
    const filePath = join(process.cwd(), 'public', 'wasm', fileName);
    
    console.log('Looking for file at:', filePath);
    
    // Vérifier si le fichier existe
    try {
      await stat(filePath);
      console.log('File exists');
    } catch (error) {
      console.log('File does not exist:', error);
      return new NextResponse(`WASM file not found: ${fileName}`, { 
        status: 404,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    // Lire le fichier
    const fileBuffer = await readFile(filePath);
    console.log('File read successfully, size:', fileBuffer.length);
    
    // Vérifier que c'est bien un fichier WASM
    const wasmMagic = new Uint8Array(fileBuffer.slice(0, 4));
    const expectedMagic = new Uint8Array([0x00, 0x61, 0x73, 0x6d]);
    
    const isValidWasm = wasmMagic.every((byte, index) => byte === expectedMagic[index]);
    
    if (!isValidWasm) {
      console.error('Invalid WASM file - wrong magic number');
      return new NextResponse('Invalid WASM file', { status: 400 });
    }
    
    console.log('Valid WASM file confirmed');
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Length': fileBuffer.length.toString(),
      }
    });
    
  } catch (error) {
    console.error('Error serving WASM file:', error);
    return new NextResponse(`Internal server error: ${error}`, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}

// Ajouter une route pour lister les fichiers WASM disponibles (debug)
export async function POST(request: NextRequest) {
  try {
    const wasmDir = join(process.cwd(), 'public', 'wasm');
    const fs = await import('fs/promises');
    
    const files = await fs.readdir(wasmDir);
    const wasmFiles = files.filter(file => file.endsWith('.wasm'));
    
    return NextResponse.json({
      available_files: wasmFiles,
      directory: wasmDir
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Could not list WASM files',
      details: error
    }, { status: 500 });
  }
}