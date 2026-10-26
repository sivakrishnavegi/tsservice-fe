import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { newId } from '@/core/ids';

export type PhotoSource = 'camera' | 'library';

export class PhotoError extends Error {}

const MAX_EDGE = 1280;
const folder = () => new Directory(Paths.document, 'tiffin-photos');

/**
 * Take or pick a photo, shrink it, and keep a copy in the app's documents folder.
 * Resolves to its file URI, or null if cancelled.
 */
export async function captureMealPhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoError(
      source === 'camera' ? 'Allow camera access in Settings to add photos.' : 'Allow photo access in Settings to add photos.',
    );
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const picked = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = picked.canceled ? undefined : picked.assets[0];
  if (!asset) return null;

  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) ctx.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  const saved = await (await ctx.renderAsync()).saveAsync({ compress: 0.75, format: SaveFormat.JPEG });

  const dir = folder();
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, `${newId()}.jpg`);
  await new File(saved.uri).copy(target);
  return target.uri;
}

/** Best effort: a stray file only costs a little space. */
export function deleteMealPhoto(uri: string | undefined): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignore
  }
}
