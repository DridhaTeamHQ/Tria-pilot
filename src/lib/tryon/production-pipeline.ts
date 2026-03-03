import 'server-only'

import {
  ALL_PRESETS,
  DEFAULT_PRESET as DEFAULT_SCENE_PRESET,
  getPresetById,
  type ScenePreset,
} from './presets/index'
import {
  buildScenePrompt,
  getSceneById,
  type SceneSpecification as LibrarySceneSpecification,
} from './scene-spec'

export interface ProductionPreset extends ScenePreset {
  name: string
  location: string
}

export interface SceneSpecification {
  id: string
  name: string
  location: string
  camera: {
    lens: string
    angle: string
    framing: string
    depth_of_field: string
  }
  lighting: {
    type: string
    quality: string
    direction: string
    color_temperature: number | null
  }
  validation: {
    required_elements: string[]
    forbidden_elements: string[]
  }
  prompt: string
}

function toProductionPreset(preset: ScenePreset): ProductionPreset {
  return {
    ...preset,
    name: preset.label,
    location: preset.scene.split(/[.;]/)[0]?.trim() || preset.label,
  }
}

function deriveLocation(spec: LibrarySceneSpecification | undefined, preset: ProductionPreset): string {
  return spec?.location || preset.location
}

function toCompatibilitySceneSpec(
  preset: ProductionPreset,
  sceneSpec?: LibrarySceneSpecification
): SceneSpecification {
  if (sceneSpec) {
    return {
      id: sceneSpec.id,
      name: sceneSpec.name,
      location: sceneSpec.location,
      camera: {
        lens: sceneSpec.cameraModel.lens,
        angle: sceneSpec.cameraModel.angle,
        framing: sceneSpec.cameraModel.framing,
        depth_of_field: sceneSpec.cameraModel.dof,
      },
      lighting: {
        type: sceneSpec.lightingModel.type,
        quality: sceneSpec.lightingModel.shadows,
        direction: sceneSpec.lightingModel.direction,
        color_temperature: sceneSpec.lightingModel.colorTemp,
      },
      validation: {
        required_elements: sceneSpec.requiredObjects,
        forbidden_elements: sceneSpec.forbiddenObjects,
      },
      prompt: buildScenePrompt(sceneSpec),
    }
  }

  return {
    id: preset.id,
    name: preset.name,
    location: preset.location,
    camera: {
      lens: preset.camera,
      angle: 'eye-level',
      framing: 'three-quarter',
      depth_of_field: 'medium',
    },
    lighting: {
      type: 'mixed',
      quality: 'soft',
      direction: 'environment-led',
      color_temperature: null,
    },
    validation: {
      required_elements: [],
      forbidden_elements: preset.negative_bias
        .split(/[.,;]/)
        .map((item) => item.trim())
        .filter(Boolean),
    },
    prompt: [
      `SCENE: ${preset.scene}`,
      `LIGHTING: ${preset.lighting}`,
      `CAMERA: ${preset.camera}`,
      `MOTION: ${preset.motion}`,
      `AVOID: ${preset.negative_bias}`,
    ].join('\n'),
  }
}

export function getProductionPreset(id: string): ProductionPreset | undefined {
  const preset = getPresetById(id)
  return preset ? toProductionPreset(preset) : undefined
}

export function getRandomProductionPreset(): ProductionPreset {
  const fallback = ALL_PRESETS[Math.floor(Math.random() * ALL_PRESETS.length)] || DEFAULT_SCENE_PRESET
  return toProductionPreset(fallback)
}

export function buildProductionPrompt(preset: ProductionPreset): string {
  return [
    `SCENE: ${preset.scene}`,
    `LIGHTING: ${preset.lighting}`,
    `CAMERA: ${preset.camera}`,
    `MOTION: ${preset.motion}`,
    `NEGATIVE BIAS: ${preset.negative_bias}`,
  ].join('\n')
}

export function logProductionPipelineStatus(presetId: string, mode: string): void {
  console.log(`\nProduction pipeline active: ${presetId} [${mode}]`)
}

export function parseToSceneSpec(preset: ProductionPreset): SceneSpecification {
  const libraryScene = getSceneById(preset.id)
  const compatibilitySpec = toCompatibilitySceneSpec(preset, libraryScene)

  return {
    ...compatibilitySpec,
    location: deriveLocation(libraryScene, preset),
  }
}

export function buildStructuralSceneBlock(spec: SceneSpecification): string {
  return spec.prompt
}
