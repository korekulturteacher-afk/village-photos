import { NextResponse } from 'next/server';
import { listPhotos } from '@/lib/google-drive';

export async function GET() {
  try {
    // Get folder IDs from environment
    const folderIds = [
      process.env.GOOGLE_DRIVE_FOLDER_ID_1!,
      process.env.GOOGLE_DRIVE_FOLDER_ID_2!,
    ].filter(Boolean);

    console.log('Testing Google Drive API with folder IDs:', folderIds);

    if (folderIds.length === 0) {
      return NextResponse.json(
        { error: 'No folder IDs configured' },
        { status: 500 }
      );
    }

    // Fetch photos from Google Drive
    const photos = await listPhotos(folderIds);

    console.log(`Found ${photos.length} photos`);
    console.log('Sample photo:', photos[0]);

    return NextResponse.json({
      success: true,
      count: photos.length,
      folderIds,
      samplePhoto: photos[0] || null,
    });
  } catch (error) {
    console.error('Error testing Google Drive API:', error);
    return NextResponse.json(
      { 
        error: 'Google Drive API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}