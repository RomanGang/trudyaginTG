import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();
    if (!phone || !password) {
      return NextResponse.json({ success: false, message: 'Введите телефон и пароль' });
    }
    // Mock login - accept any user
    const user = { id: 'user_' + phone.replace(/\D/g, ''), name: 'User', phone, role: 'worker', city: 'Москва', district: '', rating: 0, jobsDone: 0 };
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Ошибка входа' });
  }
}
