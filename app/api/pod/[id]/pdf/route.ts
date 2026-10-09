// app/api/pod/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import PDFDocument from 'pdfkit';

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
        customer: true,
        acknowledgement: true,
      },
    });

    if (!delivery || !delivery.acknowledgement) {
      return NextResponse.json(
        { error: 'Signed acknowledgement not found for this delivery.' },
        { status: 404 }
      );
    }

    // A4 Dimensions: 595.28 x 841.89 points
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const brandDark = '#1A252C';
    const brandTeal = '#2A9D8F';
    const bodyCharcoal = '#222222';
    const mutedGray = '#64748B';
    const boxBg = '#F8FAFC';
    const borderColor = '#E2E8F0';

    // ==========================================
    // 1. TOP HEADER BANNER
    // ==========================================
    doc.rect(36, 36, 523, 62).fill(brandDark);

    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
      .text('ELECTRONIC PROOF OF DELIVERY (e-POD)', 50, 48);

    doc.fillColor(brandTeal).fontSize(9).font('Helvetica-Bold')
      .text('OFFICIAL DELIVERY ACKNOWLEDGEMENT & DISPATCH RECORD', 50, 68);

    // Status Badge inside Header
    const isFull = delivery.status === 'DELIVERED';
    const badgeColor = isFull ? '#10B981' : '#F59E0B';
    const badgeText = isFull ? 'VERIFIED & CLOSED' : 'DISCREPANCY RECORDED';

    doc.rect(420, 50, 125, 22).fill(badgeColor);
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold')
      .text(badgeText, 420, 57, { width: 125, align: 'center' });

    doc.moveDown(2);

    // ==========================================
    // 2. DISPATCH & OUTLET METADATA CARDS
    // ==========================================
    const metaY = 112;
    const colWidth = 255;
    const cardHeight = 92;

    // Left Card: Dispatch Metadata
    doc.rect(36, metaY, colWidth, cardHeight).fillAndStroke(boxBg, borderColor);
    doc.fillColor(brandTeal).fontSize(8.5).font('Helvetica-Bold')
      .text('DISPATCH SPECIFICATIONS', 46, metaY + 10);

    doc.font('Helvetica').fontSize(8).fillColor(mutedGray);
    doc.text('Invoice Number: ', 46, metaY + 26, { continued: true })
      .font('Helvetica-Bold').fillColor(bodyCharcoal).text(delivery.invoiceNumber);

    doc.font('Helvetica').fillColor(mutedGray).text('Job Number: ', 46, metaY + 40, { continued: true })
      .font('Helvetica-Bold').fillColor(bodyCharcoal).text(delivery.jobNumber);

    doc.font('Helvetica').fillColor(mutedGray).text('Assigned Driver: ', 46, metaY + 54, { continued: true })
      .fillColor(bodyCharcoal).text(delivery.driverName || 'Courier Service');

    doc.fillColor(mutedGray).text('Dispatched At: ', 46, metaY + 68, { continued: true })
      .fillColor(bodyCharcoal).text(new Date(delivery.dispatchedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }));

    // Right Card: Consignee / Outlet Details
    doc.rect(304, metaY, colWidth, cardHeight).fillAndStroke(boxBg, borderColor);
    doc.fillColor(brandTeal).fontSize(8.5).font('Helvetica-Bold')
      .text('CONSIGNEE / TARGET OUTLET', 314, metaY + 10);

    doc.font('Helvetica').fontSize(8).fillColor(mutedGray);
    doc.text('Customer / Store: ', 314, metaY + 26, { continued: true })
      .font('Helvetica-Bold').fillColor(bodyCharcoal).text(delivery.customerName);

    doc.font('Helvetica').fillColor(mutedGray).text('Contact Phone: ', 314, metaY + 40, { continued: true })
      .fillColor(bodyCharcoal).text(delivery.customerPhone || 'N/A');

    doc.fillColor(mutedGray).text('Delivery Address: ', 314, metaY + 54, { continued: true })
      .fillColor(bodyCharcoal).text(delivery.outletAddress || 'Registered Outlet Address', { width: 235 });

    // ==========================================
    // 3. PRODUCTS & QUANTITY AUDIT TABLE
    // ==========================================
    const tableTop = 220;
    doc.rect(36, tableTop, 523, 22).fill(brandDark);

    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('#', 44, tableTop + 7, { width: 16 });
    doc.text('PRODUCT DESCRIPTION', 65, tableTop + 7, { width: 250 });
    doc.text('INVOICED', 320, tableTop + 7, { width: 50, align: 'right' });
    doc.text('RECEIVED', 375, tableTop + 7, { width: 50, align: 'right' });
    doc.text('SHORTAGE', 430, tableTop + 7, { width: 55, align: 'right' });
    doc.text('DAMAGED', 490, tableTop + 7, { width: 55, align: 'right' });

    let currentY = tableTop + 22;
    doc.font('Helvetica').fontSize(8);

    delivery.items.forEach((item, index) => {
      const isAlt = index % 2 === 1;
      const rowHeight = 20;

      if (isAlt) {
        doc.rect(36, currentY, 523, rowHeight).fill('#F8FAFC');
      }

      doc.fillColor(mutedGray).text(String(index + 1), 44, currentY + 6, { width: 16 });
      doc.fillColor(bodyCharcoal).font('Helvetica-Bold').text(item.productName, 65, currentY + 6, { width: 250 });

      doc.font('Helvetica').fillColor(bodyCharcoal);
      doc.text(String(item.orderedQty), 320, currentY + 6, { width: 50, align: 'right' });
      doc.text(String(item.receivedQty ?? item.orderedQty), 375, currentY + 6, { width: 50, align: 'right' });

      doc.fillColor(item.shortageQty > 0 ? '#E11D48' : '#94A3B8');
      doc.text(String(item.shortageQty), 430, currentY + 6, { width: 55, align: 'right' });

      doc.fillColor(item.damageQty > 0 ? '#E11D48' : '#94A3B8');
      doc.text(String(item.damageQty), 490, currentY + 6, { width: 55, align: 'right' });

      doc.strokeColor(borderColor).lineWidth(0.5).moveTo(36, currentY + rowHeight).lineTo(559, currentY + rowHeight).stroke();
      currentY += rowHeight;
    });

    // ==========================================
    // 4. DISCREPANCY RECORD BOX (IF APPLICABLE)
    // ==========================================
    const discrepancyItems = delivery.items.filter((i) => i.shortageQty > 0 || i.damageQty > 0 || i.discrepancyReason);

    if (discrepancyItems.length > 0) {
      currentY += 10;
      doc.rect(36, currentY, 523, 34).fillAndStroke('#FFF1F2', '#FECDD3');
      doc.fillColor('#9F1239').fontSize(8).font('Helvetica-Bold')
        .text('DOCUMENTED SHORTAGE / DAMAGE REMARKS:', 46, currentY + 7);

      const notes = discrepancyItems
        .map((i) => `${i.productName}: Short (${i.shortageQty}), Damaged (${i.damageQty}) [${i.discrepancyReason || 'Warehouse variance'}]`)
        .join(' | ');

      doc.font('Helvetica').fontSize(7.5).fillColor('#881337')
        .text(notes, 46, currentY + 18, { width: 503 });

      currentY += 34;
    }

    // ==========================================
    // 5. CUSTOMER ACKNOWLEDGEMENT & SIGNATURE
    // ==========================================
    const sigBoxY = Math.max(currentY + 14, 430);
    const sigBoxHeight = 120;

    doc.rect(36, sigBoxY, 523, sigBoxHeight).fillAndStroke(boxBg, brandTeal);

    // Header of Signature Box
    doc.fillColor(brandDark).fontSize(9).font('Helvetica-Bold')
      .text('RECIPIENT ACKNOWLEDGEMENT & CERTIFICATION', 48, sigBoxY + 12);

    doc.font('Helvetica').fontSize(7.5).fillColor(mutedGray)
      .text('I hereby confirm that the goods specified above have been examined and received in the stated quantities.', 48, sigBoxY + 25);

    // Signer Details Left
    doc.font('Helvetica').fontSize(8).fillColor(mutedGray);
    doc.text('Received By: ', 48, sigBoxY + 46, { continued: true })
      .font('Helvetica-Bold').fillColor(bodyCharcoal).text(delivery.acknowledgement.receiverName);

    doc.font('Helvetica').fillColor(mutedGray).text('NIC Number: ', 48, sigBoxY + 62, { continued: true })
      .font('Helvetica-Bold').fillColor(bodyCharcoal).text(delivery.acknowledgement.receiverNic);

    doc.font('Helvetica').fillColor(mutedGray).text('Verified At: ', 48, sigBoxY + 78, { continued: true })
      .fillColor(bodyCharcoal).text(new Date(delivery.acknowledgement.acknowledgedAt).toLocaleString('en-GB'));

    if (delivery.acknowledgement.remarks) {
      doc.font('Helvetica').fillColor(mutedGray).text('Remarks: ', 48, sigBoxY + 94, { continued: true })
        .fillColor(bodyCharcoal).text(delivery.acknowledgement.remarks, { width: 260 });
    }

    // Signature Rendering on Right with Frame
    const sigCanvasX = 350;
    const sigCanvasY = sigBoxY + 36;
    doc.rect(sigCanvasX, sigCanvasY, 190, 68).fillAndStroke('#FFFFFF', borderColor);

    if (delivery.acknowledgement.signatureDataUrl) {
      try {
        const base64Data = delivery.acknowledgement.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, sigCanvasX + 10, sigCanvasY + 6, { fit: [170, 48], align: 'center' });
      } catch (imgErr) {
        console.error('Signature Render Error:', imgErr);
      }
    }

    doc.fillColor(mutedGray).fontSize(7).font('Helvetica')
      .text('DIGITAL SIGNATURE STAMP', sigCanvasX, sigCanvasY + 54, { width: 190, align: 'center' });

    // ==========================================
    // 6. OFFICIAL AUDIT FOOTER
    // ==========================================
    const footerY = 760;
    doc.strokeColor(borderColor).lineWidth(1).moveTo(36, footerY).lineTo(559, footerY).stroke();

    doc.font('Helvetica').fontSize(7).fillColor(mutedGray).text(
      'This is a system-generated electronic document authorized under the Sri Lanka Electronic Transactions Act No. 19 of 2006.',
      36,
      footerY + 8,
      { align: 'center', width: 523 }
    );

    doc.text(
      `Document ID: ${delivery.id}  •  Generated At: ${new Date().toISOString()}  •  Status: Invoicing Closure Approved`,
      36,
      footerY + 18,
      { align: 'center', width: 523 }
    );

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ePOD_${delivery.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF document.' }, { status: 500 });
  }
}