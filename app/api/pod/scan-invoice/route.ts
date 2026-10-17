// app/api/pod/scan-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Please provide an invoice image.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Valid GEMINI_API_KEY is missing in .env file.' },
        { status: 400 }
      );
    }

    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Clean = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `
      You are an expert OCR extractor for commercial Tax Invoices (such as George Steuart Consumer Tax Invoices).
      Analyze this Tax Invoice image and extract:
      1. invoiceNumber: The Tax Invoice No (e.g. "26OCT_GSC_131896" or "26OCT_GSC_132165").
      2. customerName: The Customer's Name (e.g. "SOUTH ASIAN TECHNOLOGIES (PVT) LTD" or "SANIKMO SUPER").
      3. items: Every product row in the invoice table:
         - productCode: The Item code / SKU column (e.g. "PK1206_RS2800", "500104").
         - productName: The Description of Goods or Services column (e.g. "LS - STEUARTS BOPF PACK 1KG").
         - orderedQty: The Quantity column as an integer number (e.g. 5, 24, 100).

      Return ONLY valid JSON in this exact format:
      {
        "invoiceNumber": "26OCT_GSC_131896",
        "customerName": "SANIKMO SUPER",
        "items": [
          { "productCode": "PK1206_RS2800", "productName": "LS - STEUARTS BOPF PACK 1KG", "orderedQty": 5 }
        ]
      }
    `;

    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let lastError = '';

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: mimeType,
                          data: base64Clean,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.1,
                  responseMimeType: 'application/json',
                },
              }),
            }
          );

          const result = await response.json();

          if (response.status === 503) {
            lastError = 'Model busy (503), retrying...';
            await sleep(1500);
            continue;
          }

          if (!response.ok) {
            lastError = result?.error?.message || `API error (${response.status})`;
            break;
          }

          const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanedJson = rawText.replace(/```json|```/g, '').trim();
            const extractedData = JSON.parse(cleanedJson);
            return NextResponse.json({ success: true, data: extractedData });
          }
        } catch (err: any) {
          lastError = err.message || 'Network exception';
        }
      }
    }

    return NextResponse.json(
      { error: `Google AI is temporarily busy. Please try scanning again (${lastError}).` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Invoice Scan Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan invoice items.' },
      { status: 500 }
    );
  }
}