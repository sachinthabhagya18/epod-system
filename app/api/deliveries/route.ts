// app/api/deliveries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const deliveries = await db.delivery.findMany({
      where: {
        AND: [
          status ? { status: status as any } : {},
          search
            ? {
                OR: [
                  { invoiceNumber: { contains: search, mode: 'insensitive' } },
                  { jobNumber: { contains: search, mode: 'insensitive' } },
                  { customerName: { contains: search, mode: 'insensitive' } },
                  { driverName: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      include: {
        items: true,
        acknowledgement: true,
        driver: true,
        customer: true,
      },
      orderBy: { dispatchedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(deliveries);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve deliveries.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceNumber,
      jobNumber,
      customerId,
      customerName,
      customerPhone,
      outletAddress,
      driverId,
      driverName,
      items,
    } = body;

    if (!invoiceNumber || !jobNumber || !customerName) {
      return NextResponse.json(
        { error: 'Invoice Number, Job Number, and Customer Name are required.' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Please add at least one product item.' },
        { status: 400 }
      );
    }

    const existing = await db.delivery.findUnique({
      where: { invoiceNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Invoice Number ${invoiceNumber} already exists.` },
        { status: 400 }
      );
    }

    const newDelivery = await db.delivery.create({
      data: {
        invoiceNumber,
        jobNumber,
        customerId: customerId || null,
        customerName,
        customerPhone: customerPhone || null,
        outletAddress: outletAddress || null,
        driverId: driverId || null,
        driverName: driverName || null,
        status: 'DISPATCHED',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            productName: item.productName,
            orderedQty: Number(item.orderedQty),
          })),
        },
      },
    });

    return NextResponse.json({ success: true, delivery: newDelivery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create delivery.' }, { status: 500 });
  }
}

// DELETE DELIVERY
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Delivery ID is required.' }, { status: 400 });
    }

    await db.delivery.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Delivery successfully deleted.' });
  } catch (error) {
    console.error('Delete Delivery Error:', error);
    return NextResponse.json({ error: 'Failed to delete delivery.' }, { status: 500 });
  }
}