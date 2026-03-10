import { NextResponse } from 'next/server';

// Simple stats without DB for now
export async function GET() {
  try {
    return NextResponse.json({ jobs: 0, workers: 0, done: 0 });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ message: 'Ошибка получения статистики' }, { status: 500 });
  }
}
