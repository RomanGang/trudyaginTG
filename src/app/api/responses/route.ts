import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const respondSchema = z.object({
  jobId: z.string(),
  workerId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, workerId } = respondSchema.parse(body);

    // Check if already responded
    const existing = await prisma.response.findFirst({
      where: { jobId, workerId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Вы уже откликались' },
        { status: 400 }
      );
    }

    const response = await prisma.response.create({
      data: {
        jobId,
        workerId,
      },
    });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('respond error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка отклика' },
      { status: 400 }
    );
  }
}
