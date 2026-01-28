// app/api/admin/reset-password/route.js
import { adminAuth } from '@/lib/firebase-admin'; // You'll need to set this up
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { uid, newPassword } = await req.json();
  // Add admin check here (e.g., check session)
  try {
    await adminAuth.updateUser(uid, { password: newPassword });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}