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

const line = "--------------------------------";

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  (
    { cart, total, customerName, paymentMethod, date, invoiceNumber, userName, exchangeRate },
    ref
  ) => {
    const formattedDate = new Date(date).toLocaleString("fr-FR");

    const pad = (text: string, length: number) =>
      text.length > length ? text.slice(0, length) : text.padEnd(length);

    return (
      <div
        ref={ref}
        style={{
          width: "58mm",
          padding: "8px",
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#000",
          background: "#fff",
          lineHeight: "1.4"
        }}
      >
        <div style={{ textAlign: "center", fontWeight: "bold" }}>
          REHOBOTH BUSINESS GROUP
        </div>
        <div style={{ textAlign: "center" }}>
          RCCM 18-A-01715<br />
          45 BLVD LUMUMBA<br />
          {formattedDate}<br />
          Facture : {invoiceNumber}
        </div>

        <br />
        Client : {customerName || "Client anonyme"}<br />
        Paiement : {paymentMethod}<br />
        Caissier : {userName}<br />
        Taux : {exchangeRate.toLocaleString("fr-FR")} Fc

        <br />
        {line}
        <br />
        Qté  Désignation        Total
        <br />
        {line}

        {cart.map((item, i) => {
          const totalLine = item.price * item.quantity;
          return (
            <div key={i}>
              {pad(String(item.quantity), 4)}
              {pad(item.name.toUpperCase(), 18)}
              {pad(totalLine.toFixed(0) + "Fc", 8)}
            </div>
          );
        })}

        <br />
        {line}
        <div style={{ textAlign: "right", fontWeight: "bold" }}>
          TOTAL : {total.toLocaleString("fr-FR")} Fc
        </div>

        <br />
        <div style={{ textAlign: "center" }}>
          Merci pour votre achat !
        </div>
      </div>
    );
  }
);

export default Receipt;
