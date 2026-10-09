// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const customers = await db.customer.findMany({
      where: {
        isActive: true,
        name: { contains: query, mode: 'insensitive' },
      },
      take: 100,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search outlets.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, address } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Outlet / Customer Name is required.' }, { status: 400 });
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to register outlet.' }, { status: 500 });
  }
}

// DELETE OUTLET SAFELY
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Outlet ID is required.' }, { status: 400 });
    }

    // Disconnect from past deliveries before deletion
    await db.delivery.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await db.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Outlet deleted successfully.' });
  } catch (error) {
    console.error('Delete Outlet Error:', error);
    return NextResponse.json({ error: 'Failed to delete outlet.' }, { status: 500 });
  }
}