import React, { forwardRef } from 'react';

interface ReceiptProps {
  cart: { name: string; quantity: number; price: number }[];
  total: number;
  customerName: string | null;
  paymentMethod: string;
  date: string;
  invoiceNumber: string;
  userName: string;
  exchangeRate?: number;
}

const TAX_RATE = 0.00;

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ cart, total, customerName, paymentMethod, date, invoiceNumber, userName, exchangeRate }, ref) => {
    const totalHT = total / (1 + TAX_RATE);
    const taxAmount = total - totalHT;

    const formattedDate = new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    return (
      <>
        <style>{`
          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
              padding: 0;
            }

            html, body {
              margin: 0;
              padding: 0;
              width: 58mm;
              height: auto;
            }

            .pos-receipt {
              width: 58mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 6px !important;
              font-size: 10px !important;
              line-height: 1.1 !important;
              color: black !important;
              background: white !important;
              page-break-after: auto !important;
            }

            .pos-receipt * {
              page-break-inside: avoid !important;
            }

            .pos-header {
              page-break-inside: avoid !important;
            }

            .pos-items {
              page-break-inside: avoid !important;
            }

            .pos-item {
              page-break-inside: avoid !important;
              display: table-row !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .pos-item-col {
              display: table-cell !important;
              padding: 1px 2px !important;
              page-break-inside: avoid !important;
            }

            .pos-item-row {
              display: table !important;
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }

            .pos-footer {
              page-break-inside: avoid !important;
            }

            .no-print {
              display: none !important;
            }
          }

          @media screen {
            .pos-receipt {
              max-width: 80mm;
              margin: 0 auto;
            }

            .pos-item-row {
              display: flex !important;
              width: 100%;
            }

            .pos-item-col {
              display: flex !important;
              align-items: center;
            }
          }
        `}</style>

        <div
          ref={ref}
          className="pos-receipt"
          style={{
            width: '58mm',
            maxWidth: '80mm',
            padding: '6px',
            backgroundColor: 'white',
            color: 'black',
            fontSize: '13px',
            fontFamily: '"Courier New", monospace',
            lineHeight: '1.1',
            border: '1px solid #ddd',
          }}
        >
          {/* Header */}
          <div className="pos-header" style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 2px 0' }}>
              REHOBOTH BUSINESS GROUP
            </div>
            <div style={{ fontSize: '11px', margin: '1px 0' }}>
              RCCM 18-A-01715
            </div>
            <div style={{ fontSize: '11px', margin: '1px 0' }}>
              ID.NAT 01-93-N40495R
            </div>
            <div style={{ fontSize: '11px', margin: '1px 0' }}>
              45 BLVD LUMUMBA, MASINA
            </div>
            <div style={{ fontSize: '10px', margin: '1px 0' }}>
              Date/Heure : {formattedDate}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', margin: '1px 0' }}>
              N° Fac : {invoiceNumber}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '2px 0', padding: 0 }} />

          {/* Client Info */}
          <div style={{ fontSize: '11px', marginBottom: '4px' }}>
            <div style={{ margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong>Client:</strong> {(customerName || 'Anon').substring(0, 20)}
            </div>
            <div style={{ margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong>Mode:</strong> {paymentMethod}
            </div>
            <div style={{ margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong>Caissier:</strong> {userName}
            </div>
            {exchangeRate && (
              <div style={{ margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>
                <strong>Taux:</strong> {exchangeRate.toLocaleString('fr-FR')} Fc
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '2px 0', padding: 0 }} />

          {/* Items */}
          <div className="pos-items" style={{ marginBottom: '4px' }}>
            {/* Header */}
            <div className="pos-item-row" style={{ borderBottom: '1px solid #000', paddingBottom: '1px', marginBottom: '2px' }}>
              <div className="pos-item-col" style={{ width: '10%', fontSize: '10px', fontWeight: 'bold' }}>Qté</div>
              <div className="pos-item-col" style={{ width: '50%', fontSize: '10px', fontWeight: 'bold' }}>Désignation</div>
              <div className="pos-item-col" style={{ width: '18%', fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>P.U</div>
              <div className="pos-item-col" style={{ width: '22%', fontSize: '10px', fontWeight: 'bold', textAlign: 'right' }}>Total</div>
            </div>

            {/* Items */}
            {cart.map((item, index) => {
              const price = Number(item.price);
              const lineTotal = price * item.quantity;
              const itemName = item.name.toUpperCase().substring(0, 25);
              return (
                <div
                  key={index}
                  className="pos-item-row"
                  style={{
                    marginBottom: '2px',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <div className="pos-item-col" style={{ width: '10%', fontSize: '11px', textAlign: 'center' }}>
                    {item.quantity}
                  </div>
                  <div
                    className="pos-item-col"
                    style={{
                      width: '50%',
                      fontSize: '11px',
                      wordWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      lineHeight: '1',
                    }}
                  >
                    {itemName}
                  </div>
                  <div className="pos-item-col" style={{ width: '18%', fontSize: '11px', textAlign: 'right' }}>
                    {price.toFixed(0)}
                  </div>
                  <div className="pos-item-col" style={{ width: '22%', fontSize: '11px', textAlign: 'right' }}>
                    {lineTotal.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '2px 0', padding: 0 }} />

          {/* Totals */}
          <div className="pos-footer" style={{ fontSize: '11px', marginBottom: '4px' }}>
            <div style={{ margin: '1px 0', textAlign: 'right' }}>
              Total HT: {totalHT.toFixed(0)} Fc
            </div>
            <div style={{ margin: '1px 0', textAlign: 'right' }}>
              TVA (0%): {taxAmount.toFixed(2)} Fc
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', margin: '2px 0', textAlign: 'right' }}>
              Total TTC: {total.toLocaleString('fr-FR')} Fc
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '2px 0', padding: 0 }} />

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: '11px', margin: '2px 0' }}>
            Merci pour votre achat !
          </div>
        </div>
      </>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;
