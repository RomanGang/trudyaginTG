import { NextResponse } from 'next/server';
export async function GET(req: any) {
  return NextResponse.json({ jobs: [] });
}
