import React, { forwardRef } from "react";

interface ReceiptProps {
  cart: { name: string; quantity: number; price: number }[];
  total: number;
  customerName: string | null;
  paymentMethod: string;
  date: string;
  invoiceNumber: string;
  userName: string;
  exchangeRate: number;
}

const TAX_RATE = 0.0;

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  (
    {
      cart,
      total,
      customerName,
      paymentMethod,
      date,
      invoiceNumber,
      userName,
      exchangeRate,
    },
    ref
  ) => {
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
      <div ref={ref} className="receipt-print">
        {/* HEADER */}
        <div className="receipt-header">
          <div className="center bold">REHOBOTH BUSINESS GROUP</div>
          <div className="center small">
            RCCM 18-A-01715 - ID.NAT 01-93-N40495R
          </div>
          <div className="center small">
            45 BLVD LUMUMBA, MASINA, KINSHASA
          </div>
          <div className="center small">Date : {formattedDate}</div>
          <div className="center small">Facture : {invoiceNumber}</div>
        </div>

        <div className="line" />

        {/* INFOS CLIENT */}
        <div className="block small">
          Client : {customerName || "Client anonyme"}
        </div>
        <div className="block small">Paiement : {paymentMethod}</div>
        <div className="block small">Caissier : {userName}</div>
        <div className="block small">
          Taux : {exchangeRate.toLocaleString("fr-FR")} Fc
        </div>

        <div className="line" />

        {/* ARTICLES */}
        {cart.map((item, index) => {
          const lineTotal = item.price * item.quantity;

          return (
            <div key={index} className="item">
              <div className="item-line">
                {item.quantity} x {item.name.toUpperCase()}
              </div>
              <div className="item-sub">
                {item.price.toFixed(0)} Fc → {lineTotal.toFixed(0)} Fc
              </div>
            </div>
          );
        })}

        <div className="line" />

        {/* TOTAUX */}
        <div className="right small">Total HT : {totalHT.toFixed(0)} Fc</div>
        <div className="right small">
          TVA (0%) : {taxAmount.toFixed(0)} Fc
        </div>
        <div className="right bold">
          TOTAL : {total.toLocaleString("fr-FR")} Fc
        </div>

        <div className="center small thanks">Merci pour votre achat</div>
      </div>
    );
  }
);

export default Receipt;
