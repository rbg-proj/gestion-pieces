const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ cart, total, customerName, paymentMethod, date, invoiceNumber, userName, exchangeRate }, ref) => {

    const formattedDate = new Date(date).toLocaleString("fr-FR");

    return (
      <div
        ref={ref}
        style={{
          width: "58mm",
          padding: "8px",
          fontSize: "11px",
          color: "#000",
          background: "#fff"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <strong>REHOBOTH BUSINESS GROUP</strong><br />
          RCCM 18-A-01715<br />
          45 BLVD LUMUMBA<br />
          {formattedDate}<br />
          Facture : {invoiceNumber}
        </div>

        <hr />

        Client : {customerName || "Client anonyme"}<br />
        Paiement : {paymentMethod}<br />
        Caissier : {userName}<br />
        Taux : {exchangeRate.toLocaleString("fr-FR")} Fc

        <hr />

        Qté  Désignation     Total
        <br />
        --------------------------------

        {cart.map((item, i) => (
          <div key={i}>
            {item.quantity} x {item.name}<br />
            &nbsp;&nbsp;&nbsp;{(item.price * item.quantity).toFixed(0)} Fc
          </div>
        ))}

        <hr />

        TOTAL : {total.toLocaleString("fr-FR")} Fc

        <br /><br />
        Merci pour votre achat
      </div>
    );
  }
);
