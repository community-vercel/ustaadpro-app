import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';

const TARGET_RECEIPT_BYTES = 300 * 1024;
const compressionSteps = [
  {width: 1600, height: 1600, quality: 78},
  {width: 1400, height: 1400, quality: 68},
  {width: 1200, height: 1200, quality: 58},
  {width: 1000, height: 1000, quality: 48},
  {width: 850, height: 850, quality: 40},
  {width: 700, height: 700, quality: 32},
  {width: 560, height: 560, quality: 26},
  {width: 420, height: 420, quality: 22},
];

export type CompressedReceipt = {
  dataUrl: string;
  uri: string;
  filename: string;
  size: number;
};

export async function compressPaymentReceipt(uri: string): Promise<CompressedReceipt> {
  let best: Awaited<ReturnType<typeof ImageResizer.createResizedImage>> | null = null;

  for (const step of compressionSteps) {
    const result = await ImageResizer.createResizedImage(
      uri,
      step.width,
      step.height,
      'JPEG',
      step.quality,
      0,
      null,
      false,
      {mode: 'contain', onlyScaleDown: true},
    );
    best = result;
    if (result.size <= TARGET_RECEIPT_BYTES) break;
  }

  if (!best) throw new Error('Could not compress the receipt image.');
  const filePath = best.path || best.uri.replace(/^file:\/\//, '');
  const base64 = await RNFS.readFile(filePath, 'base64');
  return {
    dataUrl: `data:image/jpeg;base64,${base64}`,
    uri: best.uri,
    filename: best.name || `payment-receipt-${Date.now()}.jpg`,
    size: best.size,
  };
}