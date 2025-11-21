import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";

export default function ExchangeRatesPage() {
  const [rate, setRate] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch the latest rate
  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rate, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        setError("Erreur lors du chargement du taux.");
      } else if (data) {
        setRate(data.rate);
        setLastUpdated(new Date(data.created_at).toLocaleString());
      }

      setLoading(false);
    };

    fetchRate();
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

  return (
    <div className="p-6 max-w-xl mx-auto animate-fadeIn">
      <h1 className="text-3xl font-bold mb-2">Gestion du Taux de Change</h1>

      {lastUpdated && (
        <p className="text-sm text-gray-500 mb-4">
          Dernière mise à jour : <span className="font-medium">{lastUpdated}</span>
        </p>
      )}

      <Card className="shadow-lg rounded-xl border">
        <CardContent className="p-6 space-y-4">

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-600">
              <Loader2 className="animate-spin w-5 h-5" />
              Chargement du taux...
            </div>
          ) : (
            <div>
              <label className="block mb-2 font-medium">Taux actuel (CDF → USD)</label>
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
    </div>
  );
}
