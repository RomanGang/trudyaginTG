import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { jobId, fromUserId, toUserId, rating, comment } = await req.json();
    if (!fromUserId || !toUserId || !rating) {
      return NextResponse.json({ success: false, message: 'Ошибка' });
    }
    const result = db.createRating({ jobId, fromUserId, toUserId, rating, comment });
    return NextResponse.json({ success: true, rating: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка' });
  }
}
