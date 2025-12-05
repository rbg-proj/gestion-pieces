export const formatCurrency = (
  value: number | string,
  currency: "USD" | "CDF" = "USD"
): string => {

  if (value === null || value === undefined) return currency === "CDF" ? "0 FC" : "0.00 $";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return currency === "CDF" ? "0 FC" : "0.00 $";

  // Définir le nombre de décimales automatiquement selon la devise
  const options =
    currency === "CDF"
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } // Souvent sans décimales en RDC
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }; // Pour USD ou autres

  return (
    num.toLocaleString("fr-FR", options) +
    (currency === "CDF" ? " FC" : " $")
  );
};
