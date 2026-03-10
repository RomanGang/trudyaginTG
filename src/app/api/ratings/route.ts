import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const ratingSchema = z.object({
  jobId: z.string().optional(),
  fromUserId: z.string(),
  toUserId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ratingSchema.parse(body);

    const rating = await prisma.rating.create({
      data: {
        jobId: data.jobId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    // Update user rating
    const ratings = await prisma.rating.findMany({
      where: { toUserId: data.toUserId },
    });
    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await prisma.user.update({
      where: { id: data.toUserId },
      data: { rating: avgRating },
    });

    return NextResponse.json({ success: true, rating });
  } catch (error) {
    console.error('rating error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка создания отзыва' },
      { status: 400 }
    );
  }
}
