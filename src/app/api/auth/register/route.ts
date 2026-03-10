import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, phone, code, password, role, city, district } = await request.json();

    if (!name || !phone || !password || !role || !city) {
      return NextResponse.json({ success: false, message: 'Заполните все поля' });
    }

    // Verify SMS code
    const isValid = db.verifySmsCode(phone, code);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Неверный или истёкший код' });
    }

    // Check if user exists
    const existing = db.getUserByPhone(phone);
    if (existing) {
      return NextResponse.json({ success: false, message: 'Пользователь уже существует' });
    }

    // Create user
    const user = db.createUser({ phone, password, name, role, city, district: district || '' });

    db.markCodeUsed(phone);

    return NextResponse.json({ 
      success: true, 
      message: 'Регистрация успешна',
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, city: user.city, district: user.district, rating: user.rating, jobsDone: user.jobsDone }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, message: 'Ошибка регистрации' });
  }
}
