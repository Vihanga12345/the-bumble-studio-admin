import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'product-images';

/**
 * Uploads an image file to Supabase Storage
 * @param file - The image file to upload
 * @param folder - Optional folder path within the bucket
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(file: File, folder: string = 'products'): Promise<string> {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
}

/**
 * Uploads multiple image files to Supabase Storage
 * @param files - Array of image files to upload
 * @param folder - Optional folder path within the bucket
 * @returns Array of public URLs of the uploaded images
 */
export async function uploadMultipleImages(files: File[], folder: string = 'products'): Promise<string[]> {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error in uploadMultipleImages:', error);
    throw error;
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param imageUrl - The full public URL of the image to delete
 * @returns Boolean indicating success
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const urlParts = imageUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL');
    }
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
}

/**
 * Deletes multiple images from Supabase Storage
 * @param imageUrls - Array of public URLs of images to delete
 * @returns Boolean indicating success
 */
export async function deleteMultipleImages(imageUrls: string[]): Promise<boolean> {
  try {
    const filePaths = imageUrls.map(url => {
      const urlParts = url.split(`${BUCKET_NAME}/`);
      return urlParts.length >= 2 ? urlParts[1] : null;
    }).filter(Boolean) as string[];

    if (filePaths.length === 0) {
      return true;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete images: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMultipleImages:', error);
    return false;
  }
}

/**
 * Validates if a file is a valid image
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): { isValid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`
    };
  }

  return { isValid: true };
}



