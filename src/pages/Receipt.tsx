import React, { forwardRef } from 'react';

interface ReceiptProps {
  cart: { name: string; quantity: number; price: number }[];
  total: number;
  customerName: string | null;
  paymentMethod: string;
  date: string;
  invoiceNumber: string;
  userName: string;
  exchangeRate: number; // ⬅️ Ajout du taux ici
}

const TAX_RATE = 0.00;

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ cart, total, customerName, paymentMethod, date, invoiceNumber, userName,exchangeRate  }, ref) => {
    const totalHT = total / (1 + TAX_RATE);
    const taxAmount = total - totalHT;

    return (
      <div
        ref={ref}
        className="p-4 max-w-[80mm] bg-white text-black text-sm border border-gray-300"
      >
        <div className="text-center mb-2">
          <h1 className="font-bold text-base">REHOBOTH BUSINESS GROUP</h1>
          <p className="text-xs">RCCM 18-A-01715 - ID.NAT 01-93-N40495R</p>
          <p className="text-xs">45 BLVD LUMUMBA, MASINA, KINSHASA</p>
          <p className="text-xs">Date : {date}</p>
          <p className="text-xs">N° Facture : {invoiceNumber}</p>
        </div>

        <div className="mb-2 text-xs">
          <p><strong>Client :</strong> {customerName || 'Client anonyme'}  </p> 
          <p><strong>Mode de paiement :</strong> {paymentMethod}</p>
          <p> <strong>Agent :</strong> {userName}     *********  Taux : {exchangeRate?.toLocaleString("fr-FR")} Fc </p>
        </div>

        <hr className="my-2" />

        <div className="text-xs">
          <div className="flex justify-between font-bold border-b border-gray-400 pb-1 mb-1">
            <span className="w-1/6">Qté</span>
            <span className="w-2/6">Désignation</span>
            <span className="w-1/4 text-right">Prix Unit.</span>
            <span className="w-1/4 text-right">Prix Tot.</span>
          </div>
          {cart.map((item, index) => {
            const price = Number(item.price);
            const lineTotal = price * item.quantity;
            return (
              <div key={index} className="flex justify-between">
                <span className="w-1/6">{item.quantity}</span>
                <span className="w-2/6">{item.name.toUpperCase()}</span>
                <span className="w-1/4 text-right">{price.toFixed(0)}Fc</span>
                <span className="w-1/4 text-right">{lineTotal.toFixed(0)}Fc</span>
              </div>
            );
          })}
        </div>

        <hr className="my-2" />

        <div className="text-xs space-y-1 text-right">
          <p>Total HT : {totalHT.toFixed(0)}Fc</p>
          <p>TVA (0%) : {taxAmount.toFixed(2)}Fc</p>
          <p className="font-bold">Total TTC : {total.toLocaleString('fr-FR')} Fc</p>
        </div>

        <div className="text-xs space-y-1 text-center">
        <p> Merci pour votre achat !</p>
        <p> ************************************* </p>
        </div>
      </div>
    );
  }
);

export default Receipt;