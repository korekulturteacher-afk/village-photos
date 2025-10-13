import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listPhotos } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Get folder IDs from environment
    const folderIds = [
      process.env.GOOGLE_DRIVE_FOLDER_ID_1!,
      process.env.GOOGLE_DRIVE_FOLDER_ID_2!,
    ].filter(Boolean);

    if (folderIds.length === 0) {
      return NextResponse.json(
        { error: '구성된 폴더가 없습니다' },
        { status: 500 }
      );
    }

    // Fetch photos from Google Drive
    const photos = await listPhotos(folderIds);

    // Sort by date (newest first)
    photos.sort(
      (a, b) =>
        new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
    );

    return NextResponse.json({
      success: true,
      count: photos.length,
      photos,
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: '사진을 가져오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
