// app/api/runs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendSmsNotification } from '@/lib/sms';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const singleRun = await db.dispatchRun.findUnique({
        where: { id },
        include: {
          deliveries: {
            orderBy: { stopOrder: 'asc' },
            include: { items: true },
          },
        },
      });
      if (!singleRun) {
        return NextResponse.json({ error: 'Dispatch run not found.' }, { status: 404 });
      }
      return NextResponse.json(singleRun);
    }

    const runs = await db.dispatchRun.findMany({
      include: {
        deliveries: {
          orderBy: { stopOrder: 'asc' },
          include: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error('Fetch Runs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatch runs.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deliveryDate, vehicleNumber, driverName, driverPhone, routeName, stops } = body;

    if (!vehicleNumber || !driverName || !Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle Number, Driver Name, and at least one Outlet Stop are required.' },
        { status: 400 }
      );
    }

    const cleanDriverName = driverName.trim().toUpperCase();
    const cleanVehicle = vehicleNumber.trim().toUpperCase();
    const cleanDriverPhone = driverPhone ? driverPhone.trim() : null;

    // 1. Auto-Save / Sync Driver into Master Driver Table
    const existingDriver = await db.driver.findFirst({
      where: { name: cleanDriverName },
    });
    if (!existingDriver) {
      await db.driver.create({
        data: {
          name: cleanDriverName,
          phone: cleanDriverPhone || 'N/A',
          vehicleNumber: cleanVehicle,
        },
      });
    } else {
      await db.driver.update({
        where: { id: existingDriver.id },
        data: {
          vehicleNumber: cleanVehicle || existingDriver.vehicleNumber,
          phone: cleanDriverPhone || existingDriver.phone,
        },
      });
    }

    // 2. Auto-Save / Sync Outlets into Master Customer Table
    for (const s of stops) {
      const cleanCustomer = String(s.customerName || '').trim().toUpperCase();
      if (cleanCustomer) {
        const existingCustomer = await db.customer.findFirst({
          where: { name: cleanCustomer },
        });
        if (!existingCustomer) {
          await db.customer.create({
            data: {
              name: cleanCustomer,
              phone: s.customerPhone ? String(s.customerPhone).trim() : null,
            },
          });
        } else if (s.customerPhone && !existingCustomer.phone) {
          await db.customer.update({
            where: { id: existingCustomer.id },
            data: { phone: String(s.customerPhone).trim() },
          });
        }
      }
    }

    // 3. Create Dispatch Run & Deliveries
    const runNumber = `RUN-${Date.now().toString().slice(-6)}`;

    const createdRun = await db.dispatchRun.create({
      data: {
        runNumber,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        vehicleNumber: cleanVehicle,
        driverName: cleanDriverName,
        driverPhone: cleanDriverPhone,
        routeName: routeName ? routeName.trim().toUpperCase() : null,
        deliveries: {
          create: stops.map((s: any, idx: number) => ({
            stopOrder: Number(s.stopOrder) || idx + 1,
            invoiceNumber: String(s.invoiceNumber).trim(),
            customerName: String(s.customerName).trim().toUpperCase(),
            customerPhone: s.customerPhone ? String(s.customerPhone).trim() : null,
            outletAddress: s.outletAddress ? String(s.outletAddress).trim() : null,
            status: 'DISPATCHED',
          })),
        },
      },
      include: {
        deliveries: { include: { items: true } },
      },
    });

    // 4. Send Route Link via SMS to the Driver if driverPhone is provided
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const driverRouteUrl = `${baseUrl}/driver/${createdRun.id}`;

    if (cleanDriverPhone) {
      const driverSms = `Steuart Dispatch Assigned: Vehicle ${cleanVehicle} (${stops.length} Outlets). Open your daily delivery route link here: ${driverRouteUrl}`;
      await sendSmsNotification({ to: cleanDriverPhone, message: driverSms });
    }

    return NextResponse.json({
      success: true,
      message: 'Dispatch route created and SMS sent to driver.',
      run: createdRun,
      driverRouteUrl,
    });
  } catch (error: any) {
    console.error('Create Run Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create dispatch run. Ensure invoice numbers are unique.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Run ID is required.' }, { status: 400 });
    }

    await db.dispatchRun.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete dispatch run.' }, { status: 500 });
  }
}