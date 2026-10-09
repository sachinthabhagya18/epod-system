// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const products = await db.product.findMany({
      where: {
        isActive: true,
        OR: [
          { productName: { contains: query, mode: 'insensitive' } },
          { productCode: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 100,
      orderBy: { productName: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve products.' }, { status: 500 });
  }
}

// DELETE PRODUCT SAFELY
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    // Disconnect foreign key references first to avoid database constraint errors
    await db.deliveryItem.updateMany({
      where: { productId: id },
      data: { productId: null },
    });

    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 });
  }
}