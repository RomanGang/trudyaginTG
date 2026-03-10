import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ success: false, message: 'Введите телефон и пароль' });
    }

    const user = db.getUserByPhone(phone);
    if (!user || user.password !== password) {
      return NextResponse.json({ success: false, message: 'Неверный телефон или пароль' });
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, city: user.city, district: user.district, rating: user.rating, jobsDone: user.jobsDone }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка входа' });
  }
}
