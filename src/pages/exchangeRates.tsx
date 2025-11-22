import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ExchangeRatesPage() {
  const [rate, setRate] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [history, setHistory] = useState<any[]>([]);
  const [convertCdf, setConvertCdf] = useState("");
  const [convertUsd, setConvertUsd] = useState("");

  // Fetch the latest rate + history
  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setError("Erreur lors du chargement du taux.");
      } else if (data && data.length > 0) {
        setRate(data[0].rate);
        setLastUpdated(new Date(data[0].created_at).toLocaleString());

        // Format pour graphique & historique
        setHistory(
          data
            .map((item) => ({
              created_at: new Date(item.created_at).toLocaleDateString(),
              rate: item.rate,
            }))
            .reverse()
        );
      }

      setLoading(false);
    };

    fetchRates();
  }, []);

  // Save new rate
  const saveRate = async () => {
    if (!rate || rate <= 0) {
      setError("Veuillez entrer un taux valide.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("exchange_rates")
      .insert([{ rate }]);

    if (error) {
      setError("Erreur lors de l'enregistrement.");
    } else {
      setSuccess("Nouveau taux enregistré avec succès !");
    }

    setSaving(false);
  };

  // Convertisseurs
  const convertCDFtoUSD = (cdf: string) => {
    setConvertCdf(cdf);
    if (!rate || isNaN(parseFloat(cdf))) return setConvertUsd("");

    setConvertUsd((parseFloat(cdf) / rate).toFixed(2));
  };

  const convertUSDtoCDF = (usd: string) => {
    setConvertUsd(usd);
    if (!rate || isNaN(parseFloat(usd))) return setConvertCdf("");

    setConvertCdf((parseFloat(usd) * rate).toFixed(0));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8 animate-fadeIn">
      <h1 className="text-3xl font-bold">Gestion du Taux de Change</h1>

      {lastUpdated && (
        <p className="text-sm text-gray-500">
          Dernière mise à jour :
          <span className="font-medium ml-1">{lastUpdated}</span>
        </p>
      )}

      {/* --- Bloc gestion du taux --- */}
      <Card className="shadow-lg border rounded-xl">
        <CardContent className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-600">
              <Loader2 className="animate-spin w-5 h-5" />
              Chargement du taux...
            </div>
          ) : (
            <div>
              <label className="block mb-2 font-medium">
                Taux actuel (CDF → USD)
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 bg-gray-100 border rounded-lg text-sm text-gray-600">
                  CDF →
                </span>
                <Input
                  type="number"
                  className="flex-1"
                  placeholder="Ex : 2800"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                />
                <span className="px-3 py-2 bg-gray-100 border rounded-lg text-sm text-gray-600">
                  USD
                </span>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {success}
            </p>
          )}

          <Button
            onClick={saveRate}
            disabled={saving || rate <= 0}
            className="w-full mt-2"
          >
            {saving ? (
              <Loader2 className="animate-spin mr-2 w-4 h-4" />
            ) : (
              <RefreshCw className="mr-2 w-4 h-4" />
            )}
            Enregistrer le nouveau taux
          </Button>
        </CardContent>
      </Card>

      {/* --- Convertisseur CDF ↔ USD --- */}
      <Card className="shadow-md border rounded-xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Convertisseur</h2>

          {/* CDF → USD */}
          <div>
            <label className="text-sm font-medium">
              Convertir CDF → USD
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                value={convertCdf}
                onChange={(e) => convertCDFtoUSD(e.target.value)}
                placeholder="Montant en CDF"
              />
              <Input
                value={convertUsd}
                disabled
                className="bg-gray-100"
                placeholder="Résultat USD"
              />
            </div>
          </div>

          {/* USD → CDF */}
          <div>
            <label className="text-sm font-medium">
              Convertir USD → CDF
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                value={convertUsd}
                onChange={(e) => convertUSDtoCDF(e.target.value)}
                placeholder="Montant en USD"
              />
              <Input
                value={convertCdf}
                disabled
                className="bg-gray-100"
                placeholder="Résultat CDF"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Historique des taux --- */}
      <Card className="shadow-md border rounded-xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Historique récent</h2>

          <ul className="space-y-1 text-sm">
            {history
              .slice()
              .reverse()
              .map((item, index) => (
                <li
                  key={index}
                  className="flex justify-between border-b py-1 text-gray-700"
                >
                  <span>{item.created_at}</span>
                  <span className="font-medium">{item.rate} CDF</span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      {/* --- Graphique d’évolution --- */}
      <Card className="shadow-lg border rounded-xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Évolution du taux</h2>

          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="created_at" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
