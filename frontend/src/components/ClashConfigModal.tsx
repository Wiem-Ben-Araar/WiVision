'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Définir une interface pour le modèle
interface Model {
  url: string;
  name?: string;
}

export default function ClashConfigModal({ 
  models,
  open,
  onOpenChange,
  onDetect
}: { 
  models: Model[]; // Utilisation de l'interface définie
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetect: (config: { modelUrls: string[]; tolerance: number }) => Promise<void>;
}) {
  const [tolerance, setTolerance] = useState(0.01);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialSelection = models.reduce((acc, m) => ({ 
      ...acc, 
      [m.url]: false 
    }), {});
    setSelected(initialSelection);
  }, [models]);

  const handleSubmit = async () => {
    const selectedModels = models.filter(m => selected[m.url]);
    if (selectedModels.length < 2) {
      alert('Sélectionnez au moins 2 modèles');
      return;
    }

    setLoading(true);
    try {
      await onDetect({
        modelUrls: selectedModels.map(m => m.url),
        tolerance
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configuration de détection de clash</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tolerance" className="text-right">
              Tolérance (mètres)
            </Label>
            <Input
              id="tolerance"
              type="number"
              step="0.001"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="col-span-3"
            />
          </div>

          <div className="space-y-4">
            <Label className="block">Modèles à comparer:</Label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {models.map((model) => (
                <div key={model.url} className="flex items-center space-x-2">
                  <Checkbox
                    id={model.url}
                    checked={selected[model.url]}
                    onCheckedChange={(checked) => 
                      setSelected(prev => ({ ...prev, [model.url]: !!checked }))
                    }
                  />
                  <label htmlFor={model.url} className="text-sm">
                    {model.name || model.url.split('/').pop()}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Détection en cours...' : 'Lancer la détection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}