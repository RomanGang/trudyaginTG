import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { jobId, workerId } = await request.json();
    
    if (!jobId || !workerId) {
      return NextResponse.json({ success: false, message: 'Ошибка' });
    }
    
    const existing = db.getResponses(jobId).find(r => r.workerId === workerId);
    if (existing) {
      return NextResponse.json({ success: false, message: 'Вы уже откликались' });
    }
    
    const response = db.createResponse({ jobId, workerId });
    return NextResponse.json({ success: true, response });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка отклика' });
  }
}
