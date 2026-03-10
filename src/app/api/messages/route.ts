import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const messageSchema = z.object({
  jobId: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  text: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = messageSchema.parse(body);

    const message = await prisma.message.create({
      data: {
        jobId: data.jobId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('message error:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка отправки сообщения' },
      { status: 400 }
    );
  }
}
