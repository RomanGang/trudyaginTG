import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Введите номер телефона' });
    }

    // Generate a 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Store the code
    db.createSmsCode(phone, code);
    
    // In production, send SMS here
    console.log(`SMS code for ${phone}: ${code}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Код отправлен',
      debug_code: code // For development
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, message: 'Ошибка отправки кода' });
  }
}
