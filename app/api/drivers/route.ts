// app/api/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const drivers = await db.driver.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve drivers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, vehicleNumber, nic } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: 'Driver Name and Phone are required.' }, { status: 400 });
    }

    const driver = await db.driver.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        vehicleNumber: vehicleNumber ? vehicleNumber.trim() : null,
        nic: nic ? nic.trim() : null,
      },
    });

    return NextResponse.json(driver);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create driver.' }, { status: 500 });
  }
}

// DELETE DRIVER SAFELY
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Driver ID is required.' }, { status: 400 });
    }

    // Disconnect from deliveries before deletion
    await db.delivery.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    });

    await db.driver.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Driver deleted successfully.' });
  } catch (error) {
    console.error('Delete Driver Error:', error);
    return NextResponse.json({ error: 'Failed to delete driver.' }, { status: 500 });
  }
}