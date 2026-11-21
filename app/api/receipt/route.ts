import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      phone, 
      address, 
      total, 
      items, 
      deliveryOption, 
      subtotal = 0, 
      vatAmount = 0, 
      siteFee = 200, 
      deliveryFee = 0, 
      packagingFee = 0 
    } = body;

    // ✅ Brand colors
    const brandBlue = rgb(0, 0.48, 1);
    const brandGray = rgb(0.96, 0.97, 0.98);

    // ✅ Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();

    // === HEADER ===
    page.drawText("BLING’D Receipt", {
      x: 180,
      y: height - 80,
      size: 20,
      font: boldFont,
      color: brandBlue,
    });

    page.drawText(`ORDER ID: #${orderId}`, {
      x: 180,
      y: height - 100,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText("Thank you for your order!", {
      x: 200,
      y: height - 120,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // === DETAILS ===
    let y = height - 160;
    const lineHeight = 18;

    const details = [
      `Order ID: ${orderId}`,
      `Phone: ${phone}`,
      `Address: ${address}`,
      `Delivery Option: ${deliveryOption}`,
    ];

    page.drawRectangle({
      x: 40,
      y: y - 10,
      width: width - 80,
      height: lineHeight * details.length + 15,
      color: brandGray,
      borderWidth: 0,
    });

    let dy = y + lineHeight * (details.length - 1);
    for (const text of details) {
      page.drawText(text, {
        x: 55,
        y: dy,
        size: 12,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      dy -= lineHeight;
    }

    // === TABLE HEADER ===
    y = dy - 40;
    const tableX = 50;
    const colWidths = [260, 100, 100];
    const headers = ["Item", "Qty", "Price (NGN)"]; // changed ₦ → NGN

    // Draw blue background first
    page.drawRectangle({
      x: tableX - 10,
      y: y - 5,
      width: width - 100,
      height: 20,
      color: brandBlue,
    });

    // Draw headers on top
    let x = tableX;
    for (const h of headers) {
      page.drawText(h, {
        x,
        y,
        size: 12,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      x += colWidths[headers.indexOf(h)];
    }

    // === TABLE ROWS ===
    y -= 25;
    for (const item of items) {
      const row = [
        item.name,
        String(item.quantity),
        `NGN ${item.price.toLocaleString()}`, // changed ₦ → NGN
      ];

      x = tableX;
      for (const cell of row) {
        page.drawText(cell, {
          x,
          y,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        x += colWidths[row.indexOf(cell)];
      }
      y -= 18;
    }

    // === BREAKDOWN ===
    y -= 20;
    const breakdown = [
      { label: "Subtotal", amount: subtotal },
      { label: "VAT (1.5%)", amount: vatAmount },
      { label: "Site Fee", amount: siteFee },
      { label: "Delivery Fee", amount: deliveryFee },
      ...(packagingFee > 0 ? [{ label: "Packaging Fee", amount: packagingFee }] : []),
    ];

    for (const item of breakdown) {
      page.drawText(item.label, {
        x: tableX,
        y,
        size: 11,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(`NGN ${item.amount.toLocaleString()}`, {
        x: width - 200,
        y,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= lineHeight;
    }

    // === TOTAL ===
    y -= 10;
    page.drawRectangle({
      x: tableX - 10,
      y: y - 15,
      width: width - 100,
      height: 25,
      color: brandBlue,
    });

    page.drawText("Total", {
      x: tableX,
      y: y,
      size: 14,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText(`NGN ${total.toLocaleString()}`, { // changed ₦ → NGN
      x: width - 200,
      y: y,
      size: 14,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // === FOOTER ===
    page.drawText("BLING’D - Delivering Quality Fast!", {
      x: 160,
      y: 60,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText("www.example.com", {
      x: 220,
      y: 45,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // ✅ Save PDF and return
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt_${orderId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("❌ PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt", details: (error as Error).message },
      { status: 500 }
    );
  }
}
