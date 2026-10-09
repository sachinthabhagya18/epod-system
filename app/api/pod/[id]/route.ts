// app/api/pod/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
        driver: true,
        acknowledgement: true,
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery order not found.' }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error('Fetch POD Error:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery details.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { receiverName, receiverNic, signatureDataUrl, items, remarks } = body;

    if (!receiverName || !receiverNic || !signatureDataUrl) {
      return NextResponse.json(
        { error: 'Receiver Name, NIC number, and Touch Signature are mandatory.' },
        { status: 400 }
      );
    }

    const delivery = await db.delivery.findUnique({
      where: { id },
      include: { acknowledgement: true },
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery order not found.' }, { status: 404 });
    }

    if (delivery.acknowledgement) {
      return NextResponse.json(
        { error: 'This delivery has already been acknowledged and closed.' },
        { status: 400 }
      );
    }

    let hasDiscrepancy = false;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (Number(item.shortageQty) > 0 || Number(item.damageQty) > 0) {
          hasDiscrepancy = true;
          break;
        }
      }
    }

    const finalStatus = hasDiscrepancy ? 'DISCREPANCY' : 'DELIVERED';

    const updated = await db.$transaction(async (tx) => {
      if (Array.isArray(items)) {
        for (const item of items) {
          await tx.deliveryItem.update({
            where: { id: item.id },
            data: {
              receivedQty: Number(item.receivedQty),
              shortageQty: Number(item.shortageQty) || 0,
              damageQty: Number(item.damageQty) || 0,
              discrepancyReason: item.discrepancyReason || null,
            },
          });
        }
      }

      await tx.deliveryAcknowledgement.create({
        data: {
          deliveryId: id,
          receiverName: receiverName.trim(),
          receiverNic: receiverNic.trim().toUpperCase(),
          signatureDataUrl,
          remarks: remarks ? remarks.trim() : null,
          ipAddress: req.headers.get('x-forwarded-for') || null,
        },
      });

      const finalizedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          status: finalStatus,
          deliveredAt: new Date(),
        },
      });

      return finalizedDelivery;
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery acknowledgement recorded successfully.',
      delivery: updated,
    });
  } catch (error: any) {
    console.error('Submit POD Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit delivery acknowledgement.' },
      { status: 500 }
    );
  }
}