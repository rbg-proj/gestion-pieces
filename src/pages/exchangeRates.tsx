import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function ExchangeRatesPage() {
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch the latest rate
  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rate")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        setError("Erreur lors du chargement du taux.");
      } else if (data) {
        setRate(data.rate);
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

    const { error } = await supabase.from("exchange_rates").insert([{ rate }]);

    if (error) {
      setError("Erreur lors de l'enregistrement.");
    }

    setSaving(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gestion du Taux de Change</h1>

      <Card className="shadow-md">
        <CardContent className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" />
              Chargement du taux...
            </div>
          ) : (
            <div>
              <label className="block mb-2 font-medium">Taux actuel (CDF → USD)</label>
              <Input
                type="number"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button onClick={saveRate} disabled={saving} className="w-full">
            {saving && <Loader2 className="animate-spin mr-2" />} Enregistrer le nouveau taux
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
