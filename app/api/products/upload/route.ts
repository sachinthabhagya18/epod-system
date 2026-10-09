// app/api/products/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Please select an Excel file to upload.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'The uploaded Excel file contains no data.' }, { status: 400 });
    }

    let insertedCount = 0;

    for (const row of rawData) {
      const code = String(row['Product Code'] || row['Code'] || row['SKU'] || row['Item Code'] || '').trim();
      const name = String(row['Product Name'] || row['Name'] || row['Item Name'] || '').trim();
      const category = String(row['Category'] || '').trim() || null;
      const unit = String(row['Unit'] || 'Units').trim();

      if (code && name) {
        await db.product.upsert({
          where: { productCode: code },
          update: {
            productName: name,
            category: category,
            unit: unit,
            isActive: true,
          },
          create: {
            productCode: code,
            productName: name,
            category: category,
            unit: unit,
          },
        });
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} products into the catalog.`,
      count: insertedCount,
    });
  } catch (error: any) {
    console.error('Excel Upload Error:', error);
    return NextResponse.json(
      { error: 'Failed to process Excel file. Please verify column headers and file format.' },
      { status: 500 }
    );
  }
}