import { useEffect, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, X, Copy, Search, Download, Package, Layers, Hash, Info } from 'lucide-react';
import { IfcViewerAPI } from 'web-ifc-viewer';

interface IFCValue {
  value: string | number | boolean;
}

interface IFCCoordinates {
  value: number;
}

interface IFCLocation {
  Coordinates: IFCCoordinates[];
}

interface IFCPlacement {
  Location: IFCLocation;
}

interface IFCObjectPlacement {
  RelativePlacement: IFCPlacement;
}

interface IFCStructure {
  expressID: number;
  Name?: IFCValue;
}

interface IFCContainedInStructure {
  RelatingStructure: IFCStructure;
}

interface IFCRelatingObject {
  expressID: number;
}

interface IFCDecomposes {
  RelatingObject: IFCRelatingObject;
}

interface IFCProperty {
  Name: IFCValue;
  NominalValue: IFCValue;
}

interface IFCPropertyDefinition {
  Name?: IFCValue;
  HasProperties: IFCProperty[];
}

interface IFCDefinition {
  RelatingPropertyDefinition: IFCPropertyDefinition;
}

interface IFCMaterial {
  name?: string;
  color?: string;
  value?: string;
  properties?: Record<string, IFCValue | string | number>;
}

interface IFCElement {
  expressID: number;
  GlobalId?: IFCValue;
  type?: IFCValue;
  Name?: IFCValue;
  ObjectType?: IFCValue;
  Description?: IFCValue;
  Tag?: IFCValue;
  Status?: IFCValue;
  Phase?: IFCValue;
  ProductionYear?: IFCValue;
  InstallationYear?: IFCValue;
  Width?: IFCValue;
  Length?: IFCValue;
  Height?: IFCValue;
  Depth?: IFCValue;
  Area?: IFCValue;
  Volume?: IFCValue;
  ObjectPlacement?: IFCObjectPlacement;
  ContainedInStructure?: IFCContainedInStructure | IFCContainedInStructure[];
  FillsVoids?: boolean;
  IsDecomposedBy?: IFCElement[];
  Decomposes?: IFCDecomposes;
  IsDefinedBy?: IFCDefinition | IFCDefinition[];
  materials?: IFCMaterial[];
  [key: string]: unknown;
}

// Type for IFC viewer properties interface
interface IFCViewerProperties {
  getItemProperties: (modelID: number, elementID: number, recursive: boolean) => Promise<IFCElement>;
}

// Type for IFC viewer with properties
type IFCViewerWithProperties = IfcViewerAPI & {
  IFC: {
    properties?: IFCViewerProperties;
    getProperties?: (modelID: number, elementID: number, recursive: boolean) => Promise<IFCElement>;
  };
};

interface PropertySidebarProps {
  viewer: IfcViewerAPI | null;
  selectedElement: number | null;
  modelID: number | null;
  onClose?: () => void;
}

interface PropertyGroup {
  name: string;
  properties: Record<string, string | number | boolean>;
  expanded: boolean;
  priority: number;
  icon?: React.ReactNode;
}

export default function PropertySidebar({ viewer, selectedElement, modelID, onClose }: PropertySidebarProps) {
  const [properties, setProperties] = useState<IFCElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedProperty, setCopiedProperty] = useState<string | null>(null);
  
  // Copier une valeur dans le presse-papiers avec feedback visuel
  const copyToClipboard = (text: string, propertyKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedProperty(propertyKey);
    setTimeout(() => setCopiedProperty(null), 2000);
  };

  // Fonction pour extraire toutes les propriétés récursivement
  const extractAllProperties = useCallback((obj: unknown, prefix = '', result: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> => {
    if (!obj || typeof obj !== 'object') return result;
    
    const objectEntries = Object.entries(obj as Record<string, unknown>);
    
    objectEntries.forEach(([key, value]) => {
      const propName = prefix ? `${prefix}.${key}` : key;
      
      if (key === 'value' && prefix) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          result[prefix] = value;
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const valueObj = value as Record<string, unknown>;
        if (valueObj.value !== undefined) {
          if (typeof valueObj.value === 'string' || typeof valueObj.value === 'number' || typeof valueObj.value === 'boolean') {
            result[propName] = valueObj.value;
          }
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
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          result[propName] = value;
        }
      }
    });
    
    return result;
  }, []);

  // Organiser les propriétés en groupes avec icônes
  const organizeProperties = useCallback((props: IFCElement | null): PropertyGroup[] => {
    if (!props) return [];

    const groups: PropertyGroup[] = [];
    
    // Groupe principal: Informations de base (priorité la plus élevée)
    const basicProps: Record<string, string | number | boolean> = {};
    if (props.expressID) basicProps['ID'] = props.expressID;
    if (props.GlobalId?.value) basicProps['Global ID'] = props.GlobalId.value;
    if (props.type?.value) basicProps['Type IFC'] = props.type.value;
    if (props.Name?.value) basicProps['Nom'] = props.Name.value;
    if (props.ObjectType?.value) basicProps['Type d&apos;objet'] = props.ObjectType.value;
    if (props.Description?.value) basicProps['Description'] = props.Description.value;
    if (props.Tag?.value) basicProps['Tag'] = props.Tag.value;
    
    if (Object.keys(basicProps).length) {
      groups.push({
        name: 'Informations générales',
        properties: basicProps,
        expanded: true,
        priority: 100,
        icon: <Info className="h-4 w-4" />
      });
    }

    // Dimensions et géométrie (priorité élevée)
    const geometryProps: Record<string, string | number | boolean> = {};
    
    // Dimensions explicites
    const dimensions = ['Width', 'Length', 'Height', 'Depth', 'Area', 'Volume'] as const;
    dimensions.forEach(dim => {
      const propValue = props[dim];
      if (propValue && typeof propValue === 'object' && 'value' in propValue && propValue.value !== undefined) {
        geometryProps[dim] = propValue.value;
      }
    });
    
    // Récupérer les informations de placement
    if (props.ObjectPlacement?.RelativePlacement?.Location?.Coordinates) {
      const coordinates = props.ObjectPlacement.RelativePlacement.Location.Coordinates;
      if (coordinates[0]) geometryProps['Position X'] = coordinates[0].value;
      if (coordinates[1]) geometryProps['Position Y'] = coordinates[1].value;
      if (coordinates[2]) geometryProps['Position Z'] = coordinates[2].value;
    }
    
    if (Object.keys(geometryProps).length) {
      groups.push({
        name: 'Géométrie',
        properties: geometryProps,
        expanded: true,
        priority: 90,
        icon: <Package className="h-4 w-4" />
      });
    }

    // Phase et statut (priorité moyenne-haute)
    const phaseProps: Record<string, string | number | boolean> = {};
    if (props.Status?.value) phaseProps['Statut'] = props.Status.value;
    if (props.Phase?.value) phaseProps['Phase'] = props.Phase.value;
    if (props.ProductionYear?.value) phaseProps['Année de production'] = props.ProductionYear.value;
    if (props.InstallationYear?.value) phaseProps['Année d&apos;installation'] = props.InstallationYear.value;
    
    if (Object.keys(phaseProps).length) {
      groups.push({
        name: 'Phase et statut',
        properties: phaseProps,
        expanded: false,
        priority: 80,
        icon: <Layers className="h-4 w-4" />
      });
    }

    // Matériaux (priorité moyenne)
    const materialProps: Record<string, string | number | boolean> = {};
    if (props.materials && Array.isArray(props.materials) && props.materials.length > 0) {
      props.materials.forEach((material, idx) => {
        const matName = material.name || `Matériau ${idx + 1}`;
        materialProps[matName] = material.color || material.value || 'Non spécifié';
        
        if (material.properties) {
          Object.entries(material.properties).forEach(([key, value]) => {
            let materialValue: string | number | boolean;
            if (typeof value === 'object' && value !== null && 'value' in value) {
              materialValue = (value as IFCValue).value;
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              materialValue = value;
            } else {
              materialValue = String(value);
            }
            materialProps[`${matName} - ${key}`] = materialValue;
          });
        }
      });
    }
    
    if (Object.keys(materialProps).length) {
      groups.push({
        name: 'Matériaux',
        properties: materialProps,
        expanded: false,
        priority: 70,
        icon: <Hash className="h-4 w-4" />
      });
    }

    // Relations spatiales (priorité moyenne-basse)
    const relProps: Record<string, string | number | boolean> = {};
    
    if (props.ContainedInStructure) {
      const containers = Array.isArray(props.ContainedInStructure) 
        ? props.ContainedInStructure 
        : [props.ContainedInStructure];
      
      containers.forEach((container, idx) => {
        if (container.RelatingStructure) {
          const structure = container.RelatingStructure;
          relProps[`Contenu dans ${idx+1}`] = structure.expressID || 'Structure';
          if (structure.Name?.value) {
            relProps[`Nom structure ${idx+1}`] = structure.Name.value;
          }
        }
      });
    }
    
    if (props.FillsVoids) relProps['Remplit vides'] = 'Oui';
    if (props.IsDecomposedBy) relProps['Décomposé en'] = Array.isArray(props.IsDecomposedBy) ? `${props.IsDecomposedBy.length} éléments` : '1 élément';
    if (props.Decomposes) relProps['Fait partie de'] = props.Decomposes.RelatingObject?.expressID || 'Élément parent';
    
    if (Object.keys(relProps).length) {
      groups.push({
        name: 'Relations spatiales',
        properties: relProps,
        expanded: false,
        priority: 60,
        icon: <Layers className="h-4 w-4" />
      });
    }

    // Property Sets
    const commonPsets = ['Pset_Common', 'Pset_Element', 'Pset_Component'];
    
    if (props.IsDefinedBy) {
      const definitions = Array.isArray(props.IsDefinedBy) ? props.IsDefinedBy : [props.IsDefinedBy];
      
      definitions.forEach((def) => {
        if (def.RelatingPropertyDefinition?.HasProperties && Array.isArray(def.RelatingPropertyDefinition.HasProperties)) {
          const propDef = def.RelatingPropertyDefinition;
          const setName = propDef.Name?.value || 'Property Set';
          const propObj: Record<string, string | number | boolean> = {};
          
          propDef.HasProperties.forEach((prop) => {
            if (prop.Name && prop.NominalValue) {
              propObj[String(prop.Name.value)] = prop.NominalValue.value;
            }
          });
          
          if (Object.keys(propObj).length) {
            const isPriority = commonPsets.some(pset => String(setName).includes(pset));
            
            groups.push({
              name: String(setName),
              properties: propObj,
              expanded: isPriority,
              priority: isPriority ? 50 : 30,
              icon: <Hash className="h-4 w-4" />
            });
          }
        }
      });
    }

    // Ajouter les autres propriétés
    const allProps = extractAllProperties(props);
    const otherProps: Record<string, string | number | boolean> = {};
    const existingProps = new Set<string>();
    
    groups.forEach(group => {
      Object.keys(group.properties).forEach(key => {
        existingProps.add(key);
      });
    });
    
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
        priority: 10,
        icon: <Hash className="h-4 w-4" />
      });
    }

    return groups.sort((a, b) => b.priority - a.priority);
  }, [extractAllProperties]);

  // Exporter les propriétés
  const exportToExcel = () => {
    let excelXml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
    excelXml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">';
    excelXml += '<Worksheet ss:Name="Propriétés"><Table>';
    excelXml += '<Row><Cell><Data ss:Type="String">Groupe</Data></Cell>';
    excelXml += '<Cell><Data ss:Type="String">Propriété</Data></Cell>';
    excelXml += '<Cell><Data ss:Type="String">Valeur</Data></Cell></Row>';
    
    propertyGroups.forEach(group => {
      Object.entries(group.properties).forEach(([key, value]) => {
        const safeValue = typeof value === 'string' ? 
          value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(value);
        
        excelXml += '<Row>';
        excelXml += `<Cell><Data ss:Type="String">${group.name}</Data></Cell>`;
        excelXml += `<Cell><Data ss:Type="String">${key}</Data></Cell>`;
        excelXml += `<Cell><Data ss:Type="String">${safeValue}</Data></Cell>`;
        excelXml += '</Row>';
      });
    });
    
    excelXml += '</Table></Worksheet></Workbook>';
    
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel' });
    const elementName = properties?.Name?.value || `element_${selectedElement}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${elementName}_properties.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrer les propriétés
  const getFilteredProperties = () => {
    if (!searchQuery) return propertyGroups;
    
    const query = searchQuery.toLowerCase();
    return propertyGroups.map(group => {
      const filteredProps: Record<string, string | number | boolean> = {};
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

  // Basculer l'expansion d'un groupe
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
        let props: IFCElement | null = null;
        
        const viewerWithProperties = viewer as unknown as IFCViewerWithProperties;
        
        // Pour les versions récentes
        if (
          viewerWithProperties.IFC.properties &&
          typeof viewerWithProperties.IFC.properties.getItemProperties === 'function'
        ) {
          props = await viewerWithProperties.IFC.properties.getItemProperties(modelID, selectedElement, true);
        } 
        // Pour les versions plus anciennes
        else if (viewerWithProperties.IFC.getProperties) {
          props = await viewerWithProperties.IFC.getProperties(modelID, selectedElement, true);
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
  }, [viewer, selectedElement, modelID, organizeProperties]);

  const filteredGroups = getFilteredProperties();

  // Early return if viewer is not available
  if (!viewer) {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-50 to-slate-100 h-full flex flex-col border-l border-slate-200 shadow-lg">
        <div className="p-6 text-center flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">Viewer non disponible</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Le viewer IFC n&apos;est pas encore initialisé
          </p>
        </div>
      </div>
    );
  }

  if (!selectedElement) {
    return (
        <div className="w-96 bg-white h-full flex flex-col border-l border-slate-200 shadow-lg">
        <div className="p-6 text-center flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">Aucun élément sélectionné</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Cliquez sur un élément du modèle pour afficher ses propriétés détaillées
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-80 bg-white h-full border-l border-slate-200 shadow-lg">
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 opacity-20"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Chargement des propriétés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white h-full flex flex-col border-l border-slate-200 shadow-lg">
      {/* En-tête moderne */}
      <div className="bg-gradient-to-r bg-[#005CA9] text-white p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r bg-[#005CA9]"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-semibold text-lg leading-tight break-words">
              {properties?.Name?.value || `Élément ${selectedElement}`}
            </h3>
            {properties?.type?.value && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                  {properties.type.value}
                </span>
              </div>
            )}
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="bg-slate-50 border-b border-slate-200 p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher des propriétés..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={exportToExcel}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-200 group"
            title="Exporter en Excel"
          >
            <Download className="h-4 w-4 text-slate-600 group-hover:text-slate-800" />
          </button>
        </div>
      </div>

      {/* Titre de section */}
      <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
        <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Propriétés</h4>
      </div>

      {/* Contenu des propriétés */}
      <div className="flex-1 overflow-auto">
        {filteredGroups.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {filteredGroups.map((group, index) => (
              <div key={index} className="property-group">
                <button 
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors duration-200 text-left"
                  onClick={() => toggleGroup(index)}
                >
                  <div className="flex items-center">
                    <div className="mr-3 text-slate-500">
                      {group.expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="mr-3 text-blue-600">
                      {group.icon}
                    </div>
                    <h4 className="font-medium text-slate-800">{group.name}</h4>
                  </div>
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                    {Object.keys(group.properties).length}
                  </span>
                </button>
                
                {group.expanded && (
                  <div className="bg-slate-50">
                    {Object.entries(group.properties).map(([key, value], propIdx) => (
                      <div 
                        key={propIdx} 
                        className="flex items-center py-3 px-4 border-t border-slate-200 hover:bg-white transition-colors duration-150 group"
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-5 gap-3">
                          <div className="col-span-2">
                            <span className="text-sm font-medium text-slate-700 truncate block">
                              {key}
                            </span>
                          </div>
                          <div className="col-span-3">
                            <span className="text-sm text-slate-900 break-words">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        </div>
                        <button 
                          className="ml-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-all duration-200"
                          onClick={() => copyToClipboard(
                            typeof value === 'object' ? JSON.stringify(value) : String(value),
                            `${group.name}-${key}`
                          )}
                          title="Copier la valeur"
                        >
                          <Copy className={`h-3 w-3 ${copiedProperty === `${group.name}-${key}` ? 'text-green-600' : 'text-slate-500'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Aucune propriété trouvée</p>
            <p className="text-sm text-slate-500 mt-1">Essayez de modifier votre recherche</p>
          </div>
        )}
      </div>
    </div>
  );
}