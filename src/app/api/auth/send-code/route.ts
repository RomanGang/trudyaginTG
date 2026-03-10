import { NextResponse } from 'next/server';

// Simple SMS code - just return success with debug code
export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Введите номер телефона' });
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    return NextResponse.json({ success: true, message: 'Код отправлен', debug_code: code });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, message: 'Ошибка отправки кода' });
  }
}
