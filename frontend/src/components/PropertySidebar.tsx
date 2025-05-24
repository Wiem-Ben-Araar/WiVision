import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, X, Copy, MessageCircle, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

// Types
interface PropertySidebarProps {
  viewer: any;
  selectedElement: number | null;
  modelID: number | null;
  onClose?: () => void;
}

interface PropertyGroup {
  name: string;
  properties: Record<string, any>;
  expanded: boolean;
  priority: number; // Pour ordonner les groupes
}

export default function PropertySidebar({ viewer, selectedElement, modelID, onClose }: PropertySidebarProps) {
  const [properties, setProperties] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Copier une valeur dans le presse-papiers
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Vous pourriez ajouter une notification toast ici
  };

  // Fonction pour extraire toutes les propriétés récursivement
  const extractAllProperties = (obj: any, prefix = '', result: Record<string, any> = {}) => {
    if (!obj || typeof obj !== 'object') return result;
    
    Object.entries(obj).forEach(([key, value]: [string, any]) => {
      const propName = prefix ? `${prefix}.${key}` : key;
      
      if (key === 'value' && prefix) {
        result[prefix] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.value !== undefined) {
          result[propName] = value.value;
        } else {
          extractAllProperties(value, propName, result);
        }
      } else if (Array.isArray(value)) {
        result[propName] = `${value.length} éléments`;
        value.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            extractAllProperties(item, `${propName}[${idx}]`, result);
          }
        });
      } else if (value !== undefined && value !== null && key !== 'expressID') {
        result[propName] = value;
      }
    });
    
    return result;
  };

  // Organiser les propriétés en groupes façon Trimble/Tekla
  const organizeProperties = (props: any) => {
    if (!props) return [];

    const groups: PropertyGroup[] = [];
    
    // Groupe principal: Informations de base (priorité la plus élevée)
    const basicProps: Record<string, any> = {};
    if (props.expressID) basicProps['ID'] = props.expressID;
    if (props.GlobalId?.value) basicProps['Global ID'] = props.GlobalId.value;
    if (props.type?.value) basicProps['Type IFC'] = props.type.value;
    if (props.Name?.value) basicProps['Nom'] = props.Name.value;
    if (props.ObjectType?.value) basicProps['Type d\'objet'] = props.ObjectType.value;
    if (props.Description?.value) basicProps['Description'] = props.Description.value;
    if (props.Tag?.value) basicProps['Tag'] = props.Tag.value;
    
    if (Object.keys(basicProps).length) {
      groups.push({
        name: 'Informations générales',
        properties: basicProps,
        expanded: true,
        priority: 100
      });
    }

    // Dimensions et géométrie (priorité élevée)
    const geometryProps: Record<string, any> = {};
    
    // Dimensions explicites
    ['Width', 'Length', 'Height', 'Depth', 'Area', 'Volume'].forEach(dim => {
      if (props[dim]?.value !== undefined) geometryProps[dim] = props[dim].value;
    });
    
    // Récupérer les informations de placement
    if (props.ObjectPlacement) {
      if (props.ObjectPlacement.RelativePlacement) {
        const placement = props.ObjectPlacement.RelativePlacement;
        if (placement.Location) {
          const location = placement.Location;
          if (location.Coordinates) {
            geometryProps['Position X'] = location.Coordinates[0].value;
            geometryProps['Position Y'] = location.Coordinates[1].value;
            geometryProps['Position Z'] = location.Coordinates[2].value;
          }
        }
      }
    }
    
    if (Object.keys(geometryProps).length) {
      groups.push({
        name: 'Géométrie',
        properties: geometryProps,
        expanded: true,
        priority: 90
      });
    }

    // Phase et statut (priorité moyenne-haute)
    const phaseProps: Record<string, any> = {};
    if (props.Status?.value) phaseProps['Statut'] = props.Status.value;
    if (props.Phase?.value) phaseProps['Phase'] = props.Phase.value;
    if (props.ProductionYear?.value) phaseProps['Année de production'] = props.ProductionYear.value;
    if (props.InstallationYear?.value) phaseProps['Année d\'installation'] = props.InstallationYear.value;
    
    if (Object.keys(phaseProps).length) {
      groups.push({
        name: 'Phase et statut',
        properties: phaseProps,
        expanded: false,
        priority: 80
      });
    }

    // Matériaux (priorité moyenne)
    const materialProps: Record<string, any> = {};
    if (props.materials && Array.isArray(props.materials) && props.materials.length > 0) {
      props.materials.forEach((material: any, idx: number) => {
        const matName = material.name || `Matériau ${idx + 1}`;
        materialProps[matName] = material.color || material.value || 'Non spécifié';
        
        // Extraction des propriétés des matériaux
        if (material.properties) {
          Object.entries(material.properties).forEach(([key, value]: [string, any]) => {
            materialProps[`${matName} - ${key}`] = value.value !== undefined ? value.value : value;
          });
        }
      });
    }
    
    if (Object.keys(materialProps).length) {
      groups.push({
        name: 'Matériaux',
        properties: materialProps,
        expanded: false,
        priority: 70
      });
    }

    // Relations spatiales (priorité moyenne-basse)
    const relProps: Record<string, any> = {};
    
    // Conteneurs
    if (props.ContainedInStructure) {
      const containers = Array.isArray(props.ContainedInStructure) 
        ? props.ContainedInStructure 
        : [props.ContainedInStructure];
      
      containers.forEach((container: any, idx: number) => {
        if (container.RelatingStructure) {
          const structure = container.RelatingStructure;
          relProps[`Contenu dans ${idx+1}`] = structure.expressID || 'Structure';
          if (structure.Name?.value) {
            relProps[`Nom structure ${idx+1}`] = structure.Name.value;
          }
        }
      });
    }
    
    // Autres relations
    if (props.FillsVoids) relProps['Remplit vides'] = 'Oui';
    if (props.IsDecomposedBy) relProps['Décomposé en'] = Array.isArray(props.IsDecomposedBy) ? `${props.IsDecomposedBy.length} éléments` : '1 élément';
    if (props.Decomposes) relProps['Fait partie de'] = props.Decomposes.RelatingObject?.expressID || 'Élément parent';
    
    if (Object.keys(relProps).length) {
      groups.push({
        name: 'Relations spatiales',
        properties: relProps,
        expanded: false,
        priority: 60
      });
    }

    // Extraire tous les Property Sets et les organiser par type (priorité variable)
    // PropertySets communs en IFC
    const commonPsets = ['Pset_Common', 'Pset_Element', 'Pset_Component'];
    
    if (props.IsDefinedBy) {
      const definitions = Array.isArray(props.IsDefinedBy) ? props.IsDefinedBy : [props.IsDefinedBy];
      
      definitions.forEach((def: any) => {
        if (def.RelatingPropertyDefinition) {
          const propDef = def.RelatingPropertyDefinition;
          
          // PropertySet standard
          if (propDef.HasProperties && Array.isArray(propDef.HasProperties)) {
            const setName = propDef.Name?.value || 'Property Set';
            const propObj: Record<string, any> = {};
            
            propDef.HasProperties.forEach((prop: any) => {
              if (prop.Name && prop.NominalValue) {
                propObj[prop.Name.value] = prop.NominalValue.value;
              }
            });
            
            if (Object.keys(propObj).length) {
              // Priorité plus élevée pour les property sets communs
              const isPriority = commonPsets.some(pset => setName.includes(pset));
              
              groups.push({
                name: setName,
                properties: propObj,
                expanded: isPriority,
                priority: isPriority ? 50 : 30
              });
            }
          }
          
          // QuantitySets
          if (propDef.Quantities && Array.isArray(propDef.Quantities)) {
            const setName = propDef.Name?.value || 'Quantity Set';
            const propObj: Record<string, any> = {};
            
            propDef.Quantities.forEach((qty: any) => {
              if (qty.Name) {
                let value;
                if (qty.LengthValue) value = qty.LengthValue.value;
                else if (qty.AreaValue) value = qty.AreaValue.value;
                else if (qty.VolumeValue) value = qty.VolumeValue.value;
                else if (qty.CountValue) value = qty.CountValue.value;
                else if (qty.WeightValue) value = qty.WeightValue.value;
                
                if (value !== undefined) {
                  propObj[qty.Name.value] = value;
                }
              }
            });
            
            if (Object.keys(propObj).length) {
              // Quantités sont considérées importantes
              groups.push({
                name: setName,
                properties: propObj,
                expanded: true,
                priority: 40
              });
            }
          }
        }
      });
    }

    // PropertySets directs (ancienne méthode)
    if (props.PropertySets && Array.isArray(props.PropertySets)) {
      props.PropertySets.forEach((propSet: any) => {
        const setName = propSet.Name?.value || 'Property Set';
        const propObj: Record<string, any> = {};
        
        if (propSet.HasProperties && Array.isArray(propSet.HasProperties)) {
          propSet.HasProperties.forEach((prop: any) => {
            if (prop.Name && prop.NominalValue) {
              propObj[prop.Name.value] = prop.NominalValue.value;
            }
          });
        }
        
        if (Object.keys(propObj).length) {
          const isPriority = commonPsets.some(pset => setName.includes(pset));
          
          groups.push({
            name: setName,
            properties: propObj,
            expanded: isPriority,
            priority: isPriority ? 50 : 30
          });
        }
      });
    }

    // Extraction des propriétés dans hasProperties
    if (props.hasProperties) {
      const propSets = Array.isArray(props.hasProperties) ? props.hasProperties : [props.hasProperties];
      
      propSets.forEach((propSet: any, index: number) => {
        const setName = propSet.name || `Ensemble de propriétés ${index + 1}`;
        const propObj: Record<string, any> = {};
        
        if (propSet.nominalValue) {
          propObj[propSet.name || 'Valeur'] = propSet.nominalValue.value;
        }
        
        if (propSet.properties) {
          Object.entries(propSet.properties).forEach(([key, value]: [string, any]) => {
            propObj[key] = value.value !== undefined ? value.value : value;
          });
        }
        
        if (Object.keys(propObj).length) {
          const isPriority = commonPsets.some(pset => setName.includes(pset));
          
          groups.push({
            name: setName,
            properties: propObj,
            expanded: isPriority,
            priority: isPriority ? 50 : 30
          });
        }
      });
    }

    // Ajouter une catégorie pour toutes les autres propriétés trouvées (priorité la plus basse)
    const allProps = extractAllProperties(props);
    const otherProps: Record<string, any> = {};
    const existingProps = new Set();
    
    // Collecter toutes les propriétés déjà ajoutées
    groups.forEach(group => {
      Object.keys(group.properties).forEach(key => {
        existingProps.add(key);
      });
    });
    
    // Ajouter les propriétés non classées
    Object.entries(allProps).forEach(([key, value]) => {
      if (!existingProps.has(key) && !key.startsWith('expressID') && 
          !key.includes('ObjectPlacement') && !key.includes('Representation')) {
        otherProps[key] = value;
      }
    });
    
    if (Object.keys(otherProps).length) {
      groups.push({
        name: 'Autres propriétés',
        properties: otherProps,
        expanded: false,
        priority: 10
      });
    }

    // Trier les groupes par priorité
    return groups.sort((a, b) => b.priority - a.priority);
  };

  // Récupération des propriétés pour l'export Excel
  const getAllProperties = () => {
    const allProps: Record<string, any> = {};
    propertyGroups.forEach(group => {
      Object.entries(group.properties).forEach(([key, value]) => {
        allProps[`${group.name} > ${key}`] = value;
      });
    });
    return allProps;
  };

  // Exporter les propriétés au format Excel (XLSX)
  const exportToExcel = () => {
    // Créer les données au format Excel XML
    let excelXml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
    excelXml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
    excelXml += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
    excelXml += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
    excelXml += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
    excelXml += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
    
    excelXml += '<Worksheet ss:Name="Propriétés">';
    excelXml += '<Table>';
    excelXml += '<Row>';
    excelXml += '<Cell><Data ss:Type="String">Groupe</Data></Cell>';
    excelXml += '<Cell><Data ss:Type="String">Propriété</Data></Cell>';
    excelXml += '<Cell><Data ss:Type="String">Valeur</Data></Cell>';
    excelXml += '</Row>';
    
    propertyGroups.forEach(group => {
      Object.entries(group.properties).forEach(([key, value]) => {
        const safeValue = typeof value === 'string' ? 
          value.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;') : value;
        
        excelXml += '<Row>';
        excelXml += `<Cell><Data ss:Type="String">${group.name}</Data></Cell>`;
        excelXml += `<Cell><Data ss:Type="String">${key}</Data></Cell>`;
        excelXml += `<Cell><Data ss:Type="String">${safeValue}</Data></Cell>`;
        excelXml += '</Row>';
      });
    });
    
    excelXml += '</Table></Worksheet></Workbook>';
    
    // Convertir en Blob et télécharger
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel' });
    const elementName = properties?.Name?.value || `element_${selectedElement}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${elementName}_properties.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrer les propriétés selon la recherche
  const getFilteredProperties = () => {
    if (!searchQuery) return propertyGroups;
    
    const query = searchQuery.toLowerCase();
    return propertyGroups.map(group => {
      const filteredProps: Record<string, any> = {};
      Object.entries(group.properties).forEach(([key, value]) => {
        const stringValue = String(value).toLowerCase();
        if (key.toLowerCase().includes(query) || stringValue.includes(query)) {
          filteredProps[key] = value;
        }
      });
      
      return {
        ...group,
        properties: filteredProps,
        expanded: Object.keys(filteredProps).length > 0
      };
    }).filter(group => Object.keys(group.properties).length > 0);
  };

  // Fonction pour basculer l'expansion d'un groupe
  const toggleGroup = (index: number) => {
    setPropertyGroups(prev => 
      prev.map((group, idx) => 
        idx === index ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  useEffect(() => {
    const fetchProperties = async () => {
      if (!viewer || selectedElement === null || modelID === null) {
        setProperties(null);
        setPropertyGroups([]);
        return;
      }
      
      setLoading(true);
      try {
        // Essayer différentes méthodes d'API selon la version d'IFC.js
        let props = null;
        
        // Pour les versions récentes
        if (viewer.IFC.properties && viewer.IFC.properties.getItemProperties) {
          props = await viewer.IFC.properties.getItemProperties(modelID, selectedElement, true);
        } 
        // Pour les versions plus anciennes
        else if (viewer.IFC.getProperties) {
          props = await viewer.IFC.getProperties(modelID, selectedElement, true);
        }
        // Pour web-ifc-viewer
        else if (viewer.IFC.selector && viewer.IFC.selector.getProperties) {
          props = await viewer.IFC.selector.getProperties(modelID, selectedElement);
        }
        
        console.log("Propriétés récupérées:", props);
        setProperties(props);
        
        if (props) {
          const groups = organizeProperties(props);
          setPropertyGroups(groups);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des propriétés:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [viewer, selectedElement, modelID]);

  // Vue filtrée des propriétés
  const filteredGroups = getFilteredProperties();

  // Si aucun élément n'est sélectionné
  if (!selectedElement) {
    return (
      <div className="property-sidebar bg-white h-full flex flex-col">
        <div className="p-4 text-center text-gray-500">
          <p>Aucun élément sélectionné</p>
          <p className="text-sm mt-2">Cliquez sur un élément du modèle pour afficher ses propriétés</p>
        </div>
      </div>
    );
  }

  // Affichage en cours de chargement
  if (loading) {
    return (
      <div className="property-sidebar bg-white h-full">
        <div className="p-4 flex flex-col items-center justify-center h-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mb-3"></div>
          <p>Chargement des propriétés...</p>
        </div>
      </div>
    );
  }

  // Affichage principal
  return (
    <div className="property-sidebar bg-white h-full flex flex-col shadow-lg">
      {/* En-tête - Modifié: Suppression de l'ID */}
      <div className="p-4 border-b flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="font-medium text-gray-900">
            {properties?.Name?.value || `Élément`}
          </h3>
          {properties?.type?.value && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {properties.type.value}
              </Badge>
            </div>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Barre de recherche et export */}
      <div className="border-b p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher des propriétés..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => exportToExcel()}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exporter en Excel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Titre des propriétés */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <h4 className="font-medium text-gray-800">Properties</h4>
      </div>

      {/* Contenu principal - Vue groupée uniquement */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group, index) => (
              <div key={index} className="property-group">
                <div 
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  onClick={() => toggleGroup(index)}
                >
                  <div className="flex items-center">
                    {group.expanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500 mr-2" />
                    )}
                    <h4 className="font-medium text-gray-800">{group.name}</h4>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {Object.keys(group.properties).length}
                    </Badge>
                  </div>
                </div>
                
                {group.expanded && (
                  <div className="p-0 bg-white">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(group.properties).map(([key, value], propIdx) => (
                          <tr 
                            key={propIdx} 
                            className={propIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <td className="p-2 border-r border-gray-100 font-medium text-gray-700 w-1/3 truncate">
                              {key}
                            </td>
                            <td className="p-2 text-gray-900 w-2/3 group relative">
                              <div className="flex justify-between items-center">
                                <div className="truncate flex-1">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(typeof value === 'object' ? JSON.stringify(value) : String(value));
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>Aucune propriété ne correspond à votre recherche</p>
            </div>
          )}
        </div>
      </div>

     
    </div>
  );
}