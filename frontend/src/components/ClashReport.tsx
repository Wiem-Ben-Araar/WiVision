'use client';

import {useState } from 'react';
import { Button } from '@/components/ui/button';
import {Loader2, X, FileDown } from 'lucide-react';

interface ClashData {
  element_a: {
    name: string;
    type: string;
    guid: string;
    model: string;
  };
  element_b: {
    name: string;
    type: string;
    guid: string;
    model: string;
  };
  distance: number;
  position: number[];
}

export function ClashReport({ data, onClose }: { data: ClashData[]; onClose: () => void }) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Dynamically import jsPDF to avoid server-side rendering issues
      const { default: jsPDF } = await import('jspdf');
  
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Rapport de Clashs (${data.length})`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Généré le ${new Date().toLocaleDateString()}`, 14, 30);
      
      let yPos = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      data.forEach((clash, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Clash header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Clash #${index + 1}`, 14, yPos);
        yPos += 10;
        
        // Elements info
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        // Element A
        doc.text("Élément A:", 14, yPos);
        yPos += 6;
        doc.text(`Modèle: ${clash.element_a.model}`, 20, yPos);
        yPos += 6;
        doc.text(`Type: ${clash.element_a.type}`, 20, yPos);
        yPos += 6;
        doc.text(`Nom: ${clash.element_a.name}`, 20, yPos);
        yPos += 6;
        doc.text(`GUID: ${clash.element_a.guid}`, 20, yPos);
        yPos += 10;
        
        // Element B
        doc.text("Élément B:", 14, yPos);
        yPos += 6;
        doc.text(`Modèle: ${clash.element_b.model}`, 20, yPos);
        yPos += 6;
        doc.text(`Type: ${clash.element_b.type}`, 20, yPos);
        yPos += 6;
        doc.text(`Nom: ${clash.element_b.name}`, 20, yPos);
        yPos += 6;
        doc.text(`GUID: ${clash.element_b.guid}`, 20, yPos);
        yPos += 10;
        
        // Clash details
        doc.text(`Distance: ${clash.distance.toFixed(3)} m`, 14, yPos);
        yPos += 6;
        doc.text(`Position: X: ${clash.position[0].toFixed(3)}, Y: ${clash.position[1].toFixed(3)}, Z: ${clash.position[2].toFixed(3)}`, 14, yPos);
        
        yPos += 15;
        
        // Separation line
        if (index < data.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yPos - 5, pageWidth - 14, yPos - 5);
          yPos += 5;
        }
      });
      
      // Save the PDF
      doc.save("rapport-de-clashs.pdf");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="fixed right-0 top-0 h-screen w-full max-w-4xl bg-white shadow-lg overflow-auto">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Rapport de Clashs ({data.length})</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span>Télécharger PDF</span>
                  </>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {data.map((clash, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  {/* Élément A */}
                  <div className="p-4 rounded bg-green-50 border border-green-200">
                    <h3 className="font-semibold text-green-700 mb-2">Élément A</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Modèle:</span> {clash.element_a.model}</p>
                      <p><span className="font-medium">Type:</span> {clash.element_a.type}</p>
                      <p><span className="font-medium">Nom:</span> {clash.element_a.name}</p>
                      <p><span className="font-medium">GUID:</span> {clash.element_a.guid}</p>
                    </div>
                  </div>
                  
                  {/* Élément B */}
                  <div className="p-4 rounded bg-red-50 border border-red-200">
                    <h3 className="font-semibold text-red-700 mb-2">Élément B</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Modèle:</span> {clash.element_b.model}</p>
                      <p><span className="font-medium">Type:</span> {clash.element_b.type}</p>
                      <p><span className="font-medium">Nom:</span> {clash.element_b.name}</p>
                      <p><span className="font-medium">GUID:</span> {clash.element_b.guid}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Distance:</span> {clash.distance.toFixed(3)} m
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Position:</span>
                    
                    {clash.position.map((coord, i) => (
                      <span key={i} className="ml-2">
                        {['X', 'Y', 'Z'][i]}: {coord.toFixed(3)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}