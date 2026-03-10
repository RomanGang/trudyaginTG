import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  try {
    const { jobId, workerId } = await request.json();
    if (!jobId || !workerId) return NextResponse.json({ success: false, message: 'Ошибка' });
    return NextResponse.json({ success: true, response: { id: 'resp_' + Date.now(), jobId, workerId, status: 'pending' } });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка отклика' });
  }
}
