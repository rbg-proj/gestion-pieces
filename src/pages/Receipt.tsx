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
              size: 80mm auto;
              margin: 0;
              padding: 0;
            }

            html, body {
              margin: 0;
              padding: 0;
              width: 80mm;
              height: auto;
            }

            .pos-receipt {
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 8px !important;
              font-size: 11px !important;
              line-height: 1.2 !important;
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
              display: block !important;
              margin: 2px 0 !important;
              white-space: normal !important;
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              word-break: break-all !important;
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
          }
        `}</style>

        <div
          ref={ref}
          className="pos-receipt"
          style={{
            width: '80mm',
            maxWidth: '80mm',
            padding: '8px',
            backgroundColor: 'white',
            color: 'black',
            fontSize: '11px',
            fontFamily: '"Courier New", monospace',
            lineHeight: '1.2',
            border: '1px solid #ddd',
          }}
        >
          <div className="pos-header" style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 3px 0' }}>
              REHOBOTH BUSINESS GROUP
            </div>
            <div style={{ fontSize: '9px', margin: '1px 0' }}>
              RCCM 18-A-01715 - ID.NAT 01-93-N40495R
            </div>
            <div style={{ fontSize: '9px', margin: '1px 0' }}>
              45 BLVD LUMUMBA, MASINA, KINSHASA
            </div>
            <div style={{ fontSize: '9px', margin: '1px 0' }}>
              Date/Heure : {formattedDate}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', margin: '2px 0' }}>
              N° Facture : {invoiceNumber}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '4px 0', padding: 0 }} />

          <div style={{ fontSize: '9px', marginBottom: '6px' }}>
            <div style={{ margin: '1px 0' }}>
              <strong>Client :</strong> {customerName || 'Client anonyme'}
            </div>
            <div style={{ margin: '1px 0' }}>
              <strong>Mode :</strong> {paymentMethod}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1px 0' }}>
              <span>
                <strong>Caissier :</strong> {userName}
              </span>
              {exchangeRate && (
                <span style={{ fontSize: '8px' }}>
                  <strong>Taux :</strong> {exchangeRate.toLocaleString('fr-FR')}
                </span>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '4px 0', padding: 0 }} />

          <div className="pos-items" style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
              <span style={{ flex: '0 0 12%' }}>Qté</span>
              <span style={{ flex: '0 0 48%' }}>Désignation</span>
              <span style={{ flex: '0 0 18%', textAlign: 'right' }}>P. Unit</span>
              <span style={{ flex: '0 0 22%', textAlign: 'right' }}>P. Total</span>
            </div>

            {cart.map((item, index) => {
              const price = Number(item.price);
              const lineTotal = price * item.quantity;
              return (
                <div
                  key={index}
                  className="pos-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '2px',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <span style={{ flex: '0 0 12%', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <span
                    style={{
                      flex: '0 0 48%',
                      wordWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                      fontSize: '8px',
                    }}
                  >
                    {item.name.toUpperCase()}
                  </span>
                  <span style={{ flex: '0 0 18%', textAlign: 'right' }}>
                    {price.toFixed(0)}
                  </span>
                  <span style={{ flex: '0 0 22%', textAlign: 'right' }}>
                    {lineTotal.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '4px 0', padding: 0 }} />

          <div className="pos-footer" style={{ fontSize: '9px', textAlign: 'right', marginBottom: '6px' }}>
            <div style={{ margin: '1px 0' }}>Total HT : {totalHT.toFixed(0)} Fc</div>
            <div style={{ margin: '1px 0' }}>TVA (0%) : {taxAmount.toFixed(2)} Fc</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', margin: '2px 0' }}>
              Total TTC : {total.toLocaleString('fr-FR')} Fc
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '4px 0', padding: 0 }} />

          <div style={{ textAlign: 'center', fontSize: '9px', margin: '4px 0' }}>
            Merci pour votre achat !
          </div>
        </div>
      </>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;
