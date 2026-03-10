import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, phone, code, password, role, city, district } = await request.json();
    if (!name || !phone || !password || !role || !city) {
      return NextResponse.json({ success: false, message: 'Заполните все поля' });
    }
    // Create a mock user
    const user = { id: 'user_' + Date.now(), name, phone, role, city, district: district || '', rating: 0, jobsDone: 0 };
    return NextResponse.json({ success: true, message: 'Регистрация успешна', user });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, message: 'Ошибка регистрации' });
  }
}
