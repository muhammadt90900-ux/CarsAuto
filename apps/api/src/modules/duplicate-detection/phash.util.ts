/**
 * apps/api/src/modules/duplicate-detection/phash.util.ts
 *
 * Trust & Safety Prompt 3 — perceptual image hashing.
 *
 * No new npm dependency: `sharp` (^0.33.5) is already in package.json
 * (used throughout upload.service.ts for resize/format-conversion), and
 * is sufficient to implement difference-hash (dHash) directly — a
 * well-established, simple algorithm (Neal Krawetz's original dHash
 * write-up: resize to 9x8 grayscale, compare each pixel to its right
 * neighbour, one bit per comparison = 64 bits total). Pulling in a
 * dedicated pHash package (e.g. sharp-phash, blockhash-core) would just
 * wrap the same sharp calls this file already makes directly.
 *
 * dHash over aHash/pHash-DCT: robust to minor recompression/resize
 * (exactly what happens to a re-uploaded stolen photo after going through
 * another marketplace's own image pipeline), cheap to compute, and fits
 * naturally in the 64-bit / 16-hex-char VARCHAR(16) column Image.phash
 * already uses (Prompt 1).
 */

import * as sharp from 'sharp';

const HASH_WIDTH = 9; // 9 columns → 8 horizontal comparisons per row
const HASH_HEIGHT = 8;

/**
 * Computes a 64-bit difference-hash for an image buffer, returned as a
 * 16-character lowercase hex string (matches Image.phash's VARCHAR(16)).
 * Never throws for a normal image — sharp/pipeline errors propagate to the
 * caller, which should treat a failed hash as "skip this image's tier-2
 * check", never as "block the upload".
 */
export async function computeImagePHash(buffer: Buffer): Promise<string> {
  // Same CJS/esModuleInterop workaround already used in upload.service.ts's
  // uploadToCloudinary() — `sharp`'s type declarations don't line up
  // cleanly with a plain `import * as sharp` call under this project's
  // tsconfig, so the working pattern here is copied verbatim rather than
  // reinvented.
  const sharpFn = (sharp as any).default ?? sharp;
  const { data } = await sharpFn(buffer)
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = '';
  for (let row = 0; row < HASH_HEIGHT; row++) {
    const rowStart = row * HASH_WIDTH;
    for (let col = 0; col < HASH_WIDTH - 1; col++) {
      const left = data[rowStart + col]!;
      const right = data[rowStart + col + 1]!;
      bits += left < right ? '1' : '0';
    }
  }

  // 64 bits → 16 hex chars, 4 bits at a time
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

const NIBBLE_POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/**
 * Hamming distance between two 16-hex-char pHashes (0-64; lower = more
 * similar). Returns Infinity for malformed/mismatched-length input so a
 * corrupt stored hash can never accidentally look like a perfect match.
 */
export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== 16 || b.length !== 16) return Infinity;
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    const x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    if (Number.isNaN(x)) return Infinity;
    distance += NIBBLE_POPCOUNT[x]!;
  }
  return distance;
}
