import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

export interface BCFViewpoint {
  guid: string;
  perspective_camera: {
    camera_view_point: { x: number; y: number; z: number };
    camera_direction: { x: number; y: number; z: number };
    camera_up_vector: { x: number; y: number; z: number };
    field_of_view: number;
  };
  components: {
    selection: string[];    // IFC Global IDs des éléments sélectionnés
    visibility: {
      default_visibility: boolean;
      exceptions: string[]; // IFC Global IDs avec visibilité différente
      view_setup_hints: {
        spaces_visible: boolean;
        space_boundaries_visible: boolean;
        openings_visible: boolean;
      };
    };
  };
  snapshot?: string;        // Base64 de la capture d'écran
}

export interface BCFMarkup {
  guid: string;
  topic: {
    guid: string;
    title: string;
    description: string;
    creation_date: string;
    creation_author: string;
    modified_date: string;
    modified_author: string;
    assigned_to?: string;
    stage?: string;
    status: 'open' | 'in-progress' | 'resolved';
    type: 'cloud' | 'arrow' | 'text';
    priority: 'low' | 'medium' | 'high';
  };
  viewpoints: BCFViewpoint[];
  comments: {
    guid: string;
    comment: string;
    author: string;
    date: string;
    viewpoint_guid?: string;
    reply_to_guid?: string;
  }[];
}

export function createBCFMarkup(
  type: 'cloud' | 'arrow' | 'text',
  position: THREE.Vector3,
  camera: THREE.Camera,
  text: string,
  author: string,
  selectedElements: string[] = []
): BCFMarkup {
  const now = new Date().toISOString();
  const topicGuid = uuidv4();
  const viewpointGuid = uuidv4();

  return {
    guid: uuidv4(),
    topic: {
      guid: topicGuid,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Annotation`,
      description: text,
      creation_date: now,
      creation_author: author,
      modified_date: now,
      modified_author: author,
      status: 'open',
      type,
      priority: 'medium'
    },
    viewpoints: [{
      guid: viewpointGuid,
      perspective_camera: {
        camera_view_point: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        },
        camera_direction: {
          x: 0,
          y: 0,
          z: -1
        },
        camera_up_vector: {
          x: camera.up.x,
          y: camera.up.y,
          z: camera.up.z
        },
        field_of_view: 60
      },
      components: {
        selection: selectedElements,
        visibility: {
          default_visibility: true,
          exceptions: [],
          view_setup_hints: {
            spaces_visible: true,
            space_boundaries_visible: true,
            openings_visible: true
          }
        }
      }
    }],
    comments: [{
      guid: uuidv4(),
      comment: text,
      author: author,
      date: now,
      viewpoint_guid: viewpointGuid
    }]
  };
}

export function exportBCFZip(markups: BCFMarkup[]): Blob {
  // Créer un fichier BCF-ZIP
  const bcfContent = {
    version: "2.1",
    markups: markups
  };

  return new Blob([JSON.stringify(bcfContent)], {
    type: 'application/json'
  });
}