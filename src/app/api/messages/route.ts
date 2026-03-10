import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { jobId, senderId, receiverId, text } = await req.json();
    if (!jobId || !senderId || !receiverId || !text) {
      return NextResponse.json({ success: false, message: 'Ошибка' });
    }
    const message = db.createMessage({ jobId, senderId, receiverId, text });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка' });
  }
}
