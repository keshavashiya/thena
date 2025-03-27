import { Booking, Passenger, Flight } from '@/types';
import { supabase } from './supabase';

let jsPDF: any;
let html2canvas: any;

declare global {
  interface Window {
    emitter: any;
  }
}

if (typeof window !== 'undefined') {
  if (!(window as any).emitter) {
    (window as any).emitter = require('component-emitter');
  }

  Promise.all([
    import('jspdf').catch(e => console.error('Error loading jsPDF:', e)),
    import('html2canvas').catch(e => console.error('Error loading html2canvas:', e))
  ]).then(([jsPdfModule, html2canvasModule]) => {
    if (jsPdfModule) jsPDF = jsPdfModule.default;
    if (html2canvasModule) html2canvas = html2canvasModule.default;
  });
}

export async function generateETicket(
  booking: Booking,
  passengers: Passenger[],
  flight: Flight,
  customSupabase = supabase
) {
  try {
    const ticketData = {
      ticketNumber: generateTicketNumber(booking.id),
      bookingId: booking.id,
      flightInfo: {
        flightNumber: flight.flight_number,
        airline: flight.airline,
        departureAirport: flight.departure_airport,
        arrivalAirport: flight.arrival_airport,
        departureTime: flight.departure_time,
        arrivalTime: flight.arrival_time,
        cabinClass: booking.cabin_class
      },
      passengers: passengers.map(passenger => ({
        name: `${passenger.first_name} ${passenger.last_name}`,
        passportNumber: passenger.passport_number || 'Not provided',
        seatNumber: generateSeatNumber(booking.cabin_class),
      })),
      purchaseInfo: {
        totalAmount: booking.total_amount,
        purchaseDate: booking.created_at,
        paymentMethod: 'Credit Card',
      },
      qrCode: generateQRCode(booking.id),
      barcode: generateBarcode(booking.id),
      terms: getTermsAndConditions(),
    };

    const { data: sessionData } = await customSupabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      throw new Error('Authentication required to generate ticket');
    }

    const { data: userData, error: userError } = await customSupabase.storage
      .from('tickets')
      .upload(`${userId}/${booking.id}/ticket.json`, JSON.stringify(ticketData), {
        contentType: 'application/json',
        upsert: true
      });

    if (userError) {
      throw new Error(`Cannot upload ticket: ${userError.message}`);
    }

    const { data: userUrlData } = customSupabase.storage
      .from('tickets')
      .getPublicUrl(`${userId}/${booking.id}/ticket.json`);

    const publicUrl = userUrlData?.publicUrl;

    try {
      const { data: signedUrlData, error: signedUrlError } = await customSupabase.storage
        .from('tickets')
        .createSignedUrl(`${userId}/${booking.id}/ticket.json`, 60 * 60 * 24 * 7); // 7 day expiration

      return {
        ticketData,
        ticketUrl: publicUrl || signedUrlData?.signedUrl || null
      };
    } catch (urlError) {
      return {
        ticketData,
        ticketUrl: publicUrl || null
      };
    }
  } catch (error) {
    console.error('Failed to generate e-ticket:', error);
    throw error;
  }
}

function generateTicketNumber(bookingId: string): string {
  const prefix = 'TKT';
  const timestamp = Date.now().toString().slice(-8);
  const uniqueId = bookingId.replace(/-/g, '').slice(0, 8);
  return `${prefix}${timestamp}${uniqueId}`.toUpperCase();
}

function generateSeatNumber(cabinClass: string): string {
  const rows = {
    'economy': [10, 40],
    'business': [4, 9],
    'first': [1, 3]
  };

  const range = rows[cabinClass as keyof typeof rows] || rows.economy;
  const row = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  const seat = String.fromCharCode(65 + Math.floor(Math.random() * 6)); // A to F

  return `${row}${seat}`;
}

function generateQRCode(bookingId: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingId}`;
}

function generateBarcode(bookingId: string): string {
  return bookingId.replace(/-/g, '').slice(0, 16).toUpperCase();
}

function getTermsAndConditions(): string {
  return `
    TERMS AND CONDITIONS

    1. Please arrive at the airport at least 2 hours before departure for domestic flights and 3 hours for international flights.
    2. Valid identification is required for all passengers.
    3. Baggage allowance varies by cabin class and airline policy.
    4. Changes to your booking may incur additional fees.
    5. Refunds are subject to the fare rules of your ticket.

    For complete terms and conditions, please visit our website.
  `;
}

export async function getETicket(bookingId: string) {
  try {
    let userId = null;
    const { data: sessionData } = await supabase.auth.getSession();
    userId = sessionData?.session?.user?.id;

    let ticketData = null;
    let ticketUrl = null;

    if (userId) {
      try {
        const { data: userFiles, error: userListError } = await supabase.storage
          .from('tickets')
          .list(`${userId}/${bookingId}`, { limit: 10 });

        if (!userListError && userFiles?.some(file => file.name === 'ticket.json')) {
          const { data: userUrlData } = supabase.storage
            .from('tickets')
            .getPublicUrl(`${userId}/${bookingId}/ticket.json`);

          const { data: userData, error: userError } = await supabase.storage
            .from('tickets')
            .download(`${userId}/${bookingId}/ticket.json`);

          if (!userError && userData) {
            ticketData = JSON.parse(await userData.text());
            ticketUrl = userUrlData?.publicUrl;
          }
        }
      } catch (userPathError) {
      }
    }

    if (!ticketData) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('tickets')
          .list(`${bookingId}`, { limit: 10 });

        if (!listError && files?.some(file => file.name === 'ticket.json')) {
          const { data: publicUrlData } = supabase.storage
            .from('tickets')
            .getPublicUrl(`${bookingId}/ticket.json`);

          const { data, error } = await supabase.storage
            .from('tickets')
            .download(`${bookingId}/ticket.json`);

          if (!error && data) {
            ticketData = JSON.parse(await data.text());
            ticketUrl = publicUrlData?.publicUrl;
          }
        }
      } catch (standardPathError) {
      }
    }

    if (!ticketData) {
      throw new Error('Ticket not found');
    }

    return {
      ticketData,
      ticketUrl
    };
  } catch (error) {
    console.error('Failed to retrieve e-ticket:', error);
    throw error;
  }
}

export function generateTicketHtml(ticketData: any): string {
  const {
    ticketNumber,
    bookingId,
    flightInfo,
    passengers,
    purchaseInfo,
    qrCode,
    barcode
  } = ticketData;

  const passengersList = passengers.map((passenger: any) => `
    <div class="passenger">
      <div class="passenger-name">${passenger.name}</div>
      <div class="passenger-details">
        <span class="label">Seat:</span> <span class="value">${passenger.seatNumber}</span>
        ${passenger.passportNumber !== 'Not provided' ?
          `<span class="label">Passport:</span> <span class="value">${passenger.passportNumber}</span>` : ''}
      </div>
    </div>
  `).join('');

  const departureTime = new Date(flightInfo.departureTime).toLocaleString();
  const arrivalTime = new Date(flightInfo.arrivalTime).toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>E-Ticket #${ticketNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .ticket {
          width: 800px;
          margin: 20px auto;
          background-color: white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .ticket-header {
          background-color: #3B82F6;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .ticket-title {
          font-size: 24px;
          margin: 0;
        }
        .ticket-subtitle {
          font-size: 16px;
          margin: 5px 0 0;
          opacity: 0.9;
        }
        .ticket-body {
          padding: 20px;
        }
        .flight-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .flight-route {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .airport {
          text-align: center;
        }
        .airport-code {
          font-size: 28px;
          font-weight: bold;
        }
        .airport-name {
          font-size: 12px;
          color: #666;
        }
        .flight-arrow {
          width: 100px;
          height: 2px;
          background-color: #333;
          position: relative;
          margin: 0 15px;
        }
        .flight-arrow:after {
          content: '';
          position: absolute;
          right: 0;
          top: -4px;
          width: 0;
          height: 0;
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-left: 10px solid #333;
        }
        .flight-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .detail-item {
          text-align: center;
          flex: 1;
        }
        .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        .value {
          font-size: 16px;
          font-weight: bold;
        }
        .passengers {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .passenger {
          margin-bottom: 10px;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        .passenger-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .passenger-details {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        .codes {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .qr-code, .barcode {
          text-align: center;
        }
        .qr-code img {
          width: 120px;
          height: 120px;
        }
        .barcode-value {
          font-family: monospace;
          font-size: 14px;
          margin-top: 5px;
        }
        .terms {
          font-size: 10px;
          color: #666;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="ticket-header">
          <h1 class="ticket-title">Boarding Pass</h1>
          <h2 class="ticket-subtitle">E-Ticket #${ticketNumber}</h2>
        </div>
        <div class="ticket-body">
          <div class="flight-info">
            <div class="flight-route">
              <div class="airport">
                <div class="airport-code">${flightInfo.departureAirport}</div>
                <div class="airport-name">Departure</div>
              </div>
              <div class="flight-arrow"></div>
              <div class="airport">
                <div class="airport-code">${flightInfo.arrivalAirport}</div>
                <div class="airport-name">Arrival</div>
              </div>
            </div>
          </div>

          <div class="flight-details">
            <div class="detail-item">
              <div class="label">Flight</div>
              <div class="value">${flightInfo.airline} ${flightInfo.flightNumber}</div>
            </div>
            <div class="detail-item">
              <div class="label">Departure</div>
              <div class="value">${departureTime}</div>
            </div>
            <div class="detail-item">
              <div class="label">Arrival</div>
              <div class="value">${arrivalTime}</div>
            </div>
            <div class="detail-item">
              <div class="label">Class</div>
              <div class="value">${flightInfo.cabinClass.toUpperCase()}</div>
            </div>
          </div>

          <div class="passengers">
            <h3>Passengers</h3>
            ${passengersList}
          </div>

          <div class="codes">
            <div class="qr-code">
              <img src="${qrCode}" alt="QR Code">
              <div class="label">Scan QR code at the airport</div>
            </div>
            <div class="barcode">
              <div class="barcode-value">${barcode}</div>
              <div class="label">Barcode</div>
            </div>
          </div>

          <div class="terms">
            <h4>Terms and Conditions</h4>
            <p>1. Please arrive at the airport at least 2 hours before departure for domestic flights and 3 hours for international flights.</p>
            <p>2. Valid identification is required for all passengers.</p>
            <p>3. Baggage allowance varies by cabin class and airline policy.</p>
            <p>4. Changes to your booking may incur additional fees.</p>
            <p>5. Refunds are subject to the fare rules of your ticket.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generatePdfTicket(booking: Booking, passengers: Passenger[], flight: Flight, customSupabase = supabase) {
  try {
    const ticketResult = await generateETicket(booking, passengers, flight, customSupabase);

    if (!ticketResult || !ticketResult.ticketData) {
      throw new Error('Failed to generate ticket data');
    }

    const { data: sessionData } = await customSupabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      throw new Error('Authentication required to generate ticket');
    }

    const ticketHtml = generateTicketHtml(ticketResult.ticketData);

    let pdfBlob: Blob;

    if (typeof window !== 'undefined' && jsPDF && html2canvas) {
      const container = document.createElement('div');
      container.innerHTML = ticketHtml;
      container.style.width = '800px';
      container.style.margin = '0';
      container.style.padding = '0';
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const ticketElement = container.querySelector('.ticket');

        if (!ticketElement) {
          throw new Error('Could not find ticket element');
        }

        const canvas = await html2canvas(ticketElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          foreignObjectRendering: false,
          ignoreElements: (element: Element) => {
            return false;
          }
        });

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = Math.min((imgProps.height * pdfWidth) / imgProps.width, 297);

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdfBlob = pdf.output('blob');
      } catch (renderError) {
        console.error('Error rendering PDF with html2canvas:', renderError);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const ticketData = ticketResult.ticketData;

        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, 210, 30, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.text('Boarding Pass', 105, 15, { align: 'center' });
        pdf.setFontSize(16);
        pdf.text(`E-Ticket #${ticketData.ticketNumber}`, 105, 25, { align: 'center' });

        pdf.setTextColor(0, 0, 0);

        pdf.setFontSize(20);
        pdf.text(`${ticketData.flightInfo.departureAirport} → ${ticketData.flightInfo.arrivalAirport}`, 105, 50, { align: 'center' });

        pdf.setFontSize(12);
        pdf.text(`Flight: ${ticketData.flightInfo.airline} ${ticketData.flightInfo.flightNumber}`, 20, 70);
        pdf.text(`Class: ${ticketData.flightInfo.cabinClass.toUpperCase()}`, 20, 80);

        pdf.setFontSize(14);
        pdf.text('Passengers:', 20, 100);

        let yPos = 110;
        ticketData.passengers.forEach((passenger: any) => {
          pdf.text(`${passenger.name} - Seat: ${passenger.seatNumber}`, 30, yPos);
          yPos += 10;
        });

        pdfBlob = pdf.output('blob');
      } finally {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      }
    } else {
      pdfBlob = new Blob([ticketHtml], { type: 'text/html' });
    }

    const { data: pdfData, error: pdfError } = await customSupabase.storage
      .from('tickets')
      .upload(`${userId}/${booking.id}/ticket.pdf`, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (pdfError) {
      throw new Error(`Cannot upload ticket PDF: ${pdfError.message}`);
    }

    const { data: pdfUrlData } = customSupabase.storage
      .from('tickets')
      .getPublicUrl(`${userId}/${booking.id}/ticket.pdf`);

    return {
      ticketData: ticketResult.ticketData,
      ticketUrl: ticketResult.ticketUrl,
      pdfUrl: pdfUrlData?.publicUrl,
      htmlContent: ticketHtml
    };
  } catch (error) {
    console.error('Failed to generate PDF e-ticket:', error);
    throw error;
  }
}