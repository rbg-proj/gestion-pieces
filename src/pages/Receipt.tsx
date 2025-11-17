import React, { forwardRef } from 'react';

interface ReceiptProps {
  cart: { name: string; quantity: number; price: number }[];
  total: number;
  customerName: string | null;
  paymentMethod: string;
  date: string;
  invoiceNumber: string;
  userName: string;
}

const TAX_RATE = 0.00;

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ cart, total, customerName, paymentMethod, date, invoiceNumber, userName }, ref) => {
    const totalHT = total / (1 + TAX_RATE);
    const taxAmount = total - totalHT;

    return (
      <div
        ref={ref}
        className="p-4 max-w-[80mm] bg-white text-black text-sm border border-gray-300"
      >
        <div className="text-center mb-2">
          <h1 className="font-bold text-base">Perfect TechSolutions SARL</h1>
          <p className="text-xs">309, Av. Fresias, 12e Rue Rés. Limete</p>
          <p className="text-xs">Date : {date}</p>
          <p className="text-xs">N° Facture : {invoiceNumber}</p>
        </div>

        <div className="mb-2 text-xs">
          <p><strong>Client :</strong> {customerName || 'Client anonyme'} ****** 
          Caissier : {userName}
          </p>
          <p><strong>Méthode de paiement :</strong> {paymentMethod}</p>
        </div>

        <hr className="my-2" />

        <div className="text-xs">
          <div className="flex justify-between font-bold border-b border-gray-400 pb-1 mb-1">
            <span className="w-1/6">Qté</span>
            <span className="w-2/6">Désignation</span>
            <span className="w-1/4 text-right">P.U</span>
            <span className="w-1/4 text-right">P.T</span>
          </div>
          {cart.map((item, index) => {
            const price = Number(item.price);
            const lineTotal = price * item.quantity;
            return (
              <div key={index} className="flex justify-between">
                <span className="w-1/6">{item.quantity}</span>
                <span className="w-2/6">{item.name.toUpperCase()}</span>
                <span className="w-1/4 text-right">{price.toFixed(0)} Fc</span>
                <span className="w-1/4 text-right">{lineTotal.toFixed(0)} Fc</span>
              </div>
            );
          })}
        </div>

        <hr className="my-2" />

        <div className="text-xs space-y-1 text-right">
          <p>Total HT : {totalHT.toFixed(0)} Fc</p>
          <p>TVA (0%) : {taxAmount.toFixed(2)} F</p>
          <p className="font-bold">Total TTC : {total.toLocaleString('fr-FR')} Fc</p>
        </div>
       
        <p className="text-center text-xs mt-4">Merci pour votre achat !</p>
      </div>
    );
  }
);

export default Receipt;