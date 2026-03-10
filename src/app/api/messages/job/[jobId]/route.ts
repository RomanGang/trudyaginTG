import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const messages = db.getMessages(params.jobId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка' }, { status: 500 });
  }
}
