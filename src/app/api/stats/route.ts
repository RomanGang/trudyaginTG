import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const stats = db.getStats();
    return NextResponse.json({ ...stats, done: 0 });
  } catch (error) {
    return NextResponse.json({ message: 'Ошибка получения статистики' }, { status: 500 });
  }
}
