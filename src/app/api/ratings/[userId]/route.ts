import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const ratings = db.getRatings(params.userId);
    const ratingsWithUsers = ratings.map(r => ({
      ...r,
      fromUser: db.getUserById(r.fromUserId)
    }));
    return NextResponse.json({ ratings: ratingsWithUsers });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка' }, { status: 500 });
  }
}
