// app/api/runs/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Please provide a valid document image.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is missing in .env file.' },
        { status: 400 }
      );
    }

    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Clean = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const prompt = `
      You are an expert OCR data extractor for logistics dispatch sheets.
      Analyze this "DELIVERY VEHICLE ACKNOWLEDGMENT" sheet image and extract:
      1. deliveryDate: The DELIVERY DATE in YYYY-MM-DD format (e.g. "2026-10-13").
      2. vehicleNumber: The VEHICALE NO / VEHICLE NO (e.g. "PJ-4141").
      3. driverName: The DRIVER / DELIVERY PERSON name (e.g. "DHANUSHKA").
      4. routeName: The ROUTE NAME (e.g. "KATUBEDDA TO KALUTARA").
      5. stops: An array of every row in the table that has an Invoice No and Customer Name:
         - stopOrder: Row number as integer (1, 2, 3...)
         - invoiceNumber: Exact Invoice No string (e.g. "26OCT_GSC_131896")
         - customerName: Exact Customer Name string (e.g. "SANIKMO SUPER")

      Return ONLY valid JSON with this exact structure:
      {
        "deliveryDate": "2026-10-13",
        "vehicleNumber": "PJ-4141",
        "driverName": "DHANUSHKA",
        "routeName": "KATUBEDDA TO KALUTARA",
        "stops": [
          { "stopOrder": 1, "invoiceNumber": "26OCT_GSC_131896", "customerName": "SANIKMO SUPER" }
        ]
      }
    `;

    // High capacity fast models (Cascade fallback)
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
            await sleep(1500); // 1.5 seconds delay before retry
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
      { error: `Google AI is temporarily busy. Please try clicking scan again in a few seconds (${lastError}).` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('AI Scan Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan document using AI.' },
      { status: 500 }
    );
  }
}