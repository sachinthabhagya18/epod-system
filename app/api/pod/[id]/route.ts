// app/api/pod/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendSmsNotification } from '@/lib/sms';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const delivery = await db.delivery.findUnique({
      where: { id },
      include: {
        items: true,
        dispatchRun: true,
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery record not found.' }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load delivery.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { signedInvoicePhotoUrl, receiverName, receiverNic, customerPhone, remarks, items } = body;

    if (!signedInvoicePhotoUrl) {
      return NextResponse.json(
        { error: 'Please capture and upload a photo of the signed Tax Invoice.' },
        { status: 400 }
      );
    }

    const existing = await db.delivery.findUnique({
      where: { id },
      include: { dispatchRun: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Delivery order not found.' }, { status: 404 });
    }

    const finalCustomerPhone = customerPhone
      ? String(customerPhone).trim()
      : existing.customerPhone;

    // Check if any item has shortage or damage
    let hasDiscrepancy = false;
    const validItems = Array.isArray(items)
      ? items.filter((i: any) => String(i.productName || '').trim() !== '')
      : [];

    for (const item of validItems) {
      const ordered = Number(item.orderedQty) || 0;
      const received = Number(item.receivedQty ?? ordered);
      const shortage = Number(item.shortageQty) || Math.max(0, ordered - received);
      const damage = Number(item.damageQty) || 0;
      if (shortage > 0 || damage > 0 || !item.isFullComplete) {
        hasDiscrepancy = true;
      }
    }

    const finalStatus = hasDiscrepancy ? 'DISCREPANCY' : 'DELIVERED';

    // 1. Auto-Sync scanned products into the Master Product Catalog table
    for (let idx = 0; idx < validItems.length; idx++) {
      const item = validItems[idx];
      const rawCode = String(item.productCode || '').trim().toUpperCase();
      const rawName = String(item.productName || '').trim();
      const generatedCode = rawCode || `ITEM-${rawName.substring(0, 8).toUpperCase().replace(/\s+/g, '')}`;

      await db.product.upsert({
        where: { productCode: generatedCode },
        update: { productName: rawName, isActive: true },
        create: {
          productCode: generatedCode,
          productName: rawName,
          category: 'Invoice Scanned',
          unit: 'Units',
        },
      });
    }

    // 2. Sync customer phone to Master Customer table if entered/updated
    if (finalCustomerPhone) {
      const existingCustomer = await db.customer.findFirst({
        where: { name: existing.customerName },
      });
      if (existingCustomer) {
        await db.customer.update({
          where: { id: existingCustomer.id },
          data: { phone: finalCustomerPhone },
        });
      }
    }

    // 3. Save Delivery Confirmation and Items
    const updated = await db.$transaction(async (tx) => {
      await tx.deliveryItem.deleteMany({ where: { deliveryId: id } });

      const deliv = await tx.delivery.update({
        where: { id },
        data: {
          signedInvoicePhotoUrl,
          customerPhone: finalCustomerPhone || null,
          receiverName: receiverName ? receiverName.trim() : 'Outlet Representative',
          receiverNic: receiverNic ? receiverNic.trim().toUpperCase() : null,
          remarks: remarks ? remarks.trim() : null,
          status: finalStatus,
          deliveredAt: new Date(),
          items: {
            create: validItems.map((item: any) => {
              const ordered = Number(item.orderedQty) || 0;
              const received = item.isFullComplete
                ? ordered
                : Number(item.receivedQty ?? ordered);
              const shortage = item.isFullComplete
                ? 0
                : Math.max(0, ordered - received);
              const damage = item.isFullComplete ? 0 : Number(item.damageQty) || 0;

              return {
                productCode: item.productCode ? String(item.productCode).trim().toUpperCase() : null,
                productName: String(item.productName).trim(),
                orderedQty: ordered,
                receivedQty: received,
                shortageQty: shortage,
                damageQty: damage,
                discrepancyReason: item.discrepancyReason ? String(item.discrepancyReason).trim() : null,
              };
            }),
          },
        },
        include: { items: true },
      });

      return deliv;
    });

    // 4. Send SMS Notification to Outlet (Customer) & Admin
    const statusLabel = hasDiscrepancy ? 'WITH SHORTAGE/DAMAGE' : 'IN FULL GOOD CONDITION';
    const adminPhone = process.env.ADMIN_ALERT_PHONE;

    if (finalCustomerPhone) {
      const customerSms = `Delivery is Confirmed! Invoice ${existing.invoiceNumber} for ${existing.customerName} (${validItems.length} items - ${statusLabel}) has been delivered and acknowledged. Thank you!`;
      await sendSmsNotification({ to: finalCustomerPhone, message: customerSms });
    }

    if (adminPhone) {
      const adminSms = `e-POD Alert: Invoice ${existing.invoiceNumber} (${existing.customerName}) delivered [${statusLabel}] by ${
        existing.dispatchRun?.driverName || 'Driver'
      }.`;
      await sendSmsNotification({ to: adminPhone, message: adminSms });
    }

    return NextResponse.json({
      success: true,
      message: finalCustomerPhone
        ? `Delivery confirmed and SMS sent to ${finalCustomerPhone}!`
        : 'Delivery confirmed and saved successfully!',
      delivery: updated,
    });
  } catch (error: any) {
    console.error('Submit POD Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit delivery confirmation.' },
      { status: 500 }
    );
  }
}