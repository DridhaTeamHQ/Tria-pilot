import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
// PHASE 2: Cost Control & Abuse Prevention
import {
  checkGenerationGate,
  completeGeneration,
  isKillSwitchActive,
  type GenerationGateResult
} from '@/lib/generation-limiter'
import { getGeminiKey, getOpenAIKey } from '@/lib/config/api-keys'
import { getTryOnPresetV3 } from '@/lib/tryon/presets'
import { normalizeBase64 } from '@/lib/image-processing'
import { runTryOnPipelineV3 } from '@/lib/tryon/pipeline'
import { saveUpload } from '@/lib/storage'
import prisma from '@/lib/prisma'
// NEW: Production pipeline with ChatGPT Image 1.5 and face preservation
import { runProductionTryOnPipeline } from '@/lib/tryon/production-tryon-pipeline'
import { getVariantSpec, buildVariantPromptModifier, VARIANT_IDENTITY_LOCK, logVariantGeneration } from '@/lib/tryon/variant-specs'
// IPCR-X Architecture imports
import { buildPipelineV4, enforceTemperature, IDENTITY_VERIFICATION_SUFFIX, type Variant } from '@/lib/tryon/pipeline-v4'
import { getIdentityLayersPrompt } from '@/lib/tryon/identity-layers'
// CBN-ST™ Clothing Body Neutralization
import { getCBNSTPrompt, logCBNSTStatus } from '@/lib/tryon/cbn-safetensor'
// Intelligent Body Scan System
import { getBodyScanPrompt, logBodyScanStatus } from '@/lib/tryon/body-scan'
// Intelligent Garment Extraction System
import { getGarmentScanPrompt, logGarmentScanStatus } from '@/lib/tryon/garment-scan'
// Fabric Physics & Realism System
import { getFabricPhysicsPrompt, logFabricPhysicsStatus } from '@/lib/tryon/fabric-physics'
// Photographic Compositor Constraints (Core Override System)
import { getPhotographicCompositorConstraints, logPhotographicCompositorStatus } from '@/lib/tryon/photographic-compositor-constraints'
// Strict Identity Enforcement (Highest Priority)
import { getStrictIdentityEnforcement, logStrictEnforcementStatus } from '@/lib/tryon/identity-enforcement-strict'
// Face Freeze Concise (Token-efficient, zero tolerance for face drift)
import { getFaceFreezeConcise, logFaceFreezeConciseStatus } from '@/lib/tryon/face-freeze-concise'
// Face & Garment Ultra Lock (Maximum strength for both face and garment)
import { getFaceGarmentUltraLock, getFaceUltraLock, getGarmentUltraLock, logFaceGarmentUltraLockStatus } from '@/lib/tryon/face-garment-ultra-lock'
// Identity, Garment, and Realism Constraints (Comprehensive Priority System)
import { getIdentityGarmentRealismConstraints, logIdentityGarmentRealismStatus } from '@/lib/tryon/identity-garment-realism-constraints'
// Naturalism Enforcement (Face drift, stiff poses, unrealism fixes)
import { getNaturalismEnforcement, logNaturalismEnforcementStatus } from '@/lib/tryon/naturalism-enforcement'
// Cross-Variant Face Consistency (Ensures identical face across all 3 variants)
import { getCrossVariantFaceConsistency, getVariantFaceReminder, logCrossVariantFaceConsistencyStatus } from '@/lib/tryon/cross-variant-face-consistency'
// Unified Identity System (Face + Body = One unified entity, person-first generation)
import { getUnifiedIdentitySystem, getPersonFirstGeneration, getFaceBodyConnection, logUnifiedIdentityStatus } from '@/lib/tryon/unified-identity-system'
// Face, Realism, and Garment Master Enforcement (Biometric face matching, photographic realism, exact garment copy)
import { getFaceRealismGarmentMaster, logFaceRealismGarmentMasterStatus } from '@/lib/tryon/face-realism-garment-master'
// Intelligent RAG System (Real-world data, face copy, camera, lighting, physics)
import { runIntelligentRAG, getRAGContextForPrompt, logIntelligentRAGStatus } from '@/lib/tryon/intelligent-rag-system'
// User Analysis and Garment Classification (for RAG)
import { analyzeUserImage } from '@/lib/tryon/intelligence/user-analyzer'
import { classifyGarment } from '@/lib/tryon/intelligence/garment-classifier'
// Scene Specification (for presets)
import { getSceneById, buildScenePrompt } from '@/lib/tryon/scene-spec'

export async function POST(request: Request) {
  try {
    // Validate API keys using unified config
    try {
      getGeminiKey()
    } catch (keyError) {
      return NextResponse.json(
        { error: keyError instanceof Error ? keyError.message : 'API keys not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prisma manages connections automatically via pool
    let dbUser
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: authUser.email! },
        select: {
          id: true,
          email: true,
          name: true,
        },
      })
    } catch (dbError) {
      console.error('Database query error:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: GENERATION GATE (User + Session + IP limits)
    // This MUST happen before ANY AI calls
    // ═══════════════════════════════════════════════════════════════

    // Extract IP from request headers
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

    const gateResult = checkGenerationGate(dbUser.id, clientIp)

    if (!gateResult.allowed) {
      console.log(`🚫 Generation blocked: ${gateResult.blockReason}`)
      return NextResponse.json(
        {
          error: gateResult.blockReason || 'Generation not allowed',
          remainingToday: gateResult.remainingToday,
        },
        { status: 429 }
      )
    }

    // Store requestId for completion tracking
    const generationRequestId = gateResult.requestId

    const body = await request.json()
    const {
      personImage,
      personImages,
      editType,
      clothingImage,
      backgroundImage,
      accessoryImages, // NEW: accessory images
      accessoryTypes,  // NEW: accessory type labels
      model,
      stylePreset,
      userRequest,
      background,
      pose,
      expression,
      camera,
      lighting,
      addOns,
      aspectRatio: reqAspectRatio,
      resolution: reqResolution
    } = tryOnSchema.parse(body)

    // Map user-friendly model names to Gemini model IDs
    const geminiModel = model === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
    console.log(`📊 Selected model: ${model} (${geminiModel})`)

    const presetV3 = stylePreset ? getTryOnPresetV3(stylePreset) : undefined
    if (stylePreset) {
      console.log(`🎨 Preset: ${stylePreset} → ${presetV3?.name || 'NOT FOUND'}`)
      if (presetV3) {
        console.log(`📸 Background: "${presetV3.background_name}"`)
      }
    }

    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        userId: dbUser.id,
        inputs: {
          personImage,
          clothingImage,
          backgroundImage,
          editType,
        },
        settings: {
          stylePreset,
          background,
          pose,
          expression,
          camera,
          lighting,
          userRequest,
          addOns,
          model: geminiModel,
        },
        status: 'pending',
      },
    })

    try {
      console.log('🚀 Starting try-on generation for job:', job.id)

      // Normalize images
      const normalizedPerson = normalizeBase64(personImage)
      const normalizedClothing = clothingImage ? normalizeBase64(clothingImage) : undefined
      const normalizedBackground = backgroundImage ? normalizeBase64(backgroundImage) : undefined
      // NOTE: identityImages (personImages) are no longer used in new architecture
      // Identity comes from person image only (pixel-level)

      if (!normalizedClothing) {
        throw new Error('Clothing image is required for try-on')
      }

      const preset = presetV3
        ? {
          id: presetV3.id,  // Pass preset ID for scene lookup
          pose_name: presetV3.pose_name,
          lighting_name: presetV3.lighting_name,
          background_name: presetV3.background_name,
          style_pack: presetV3.style_pack,
          background_focus: presetV3.background_focus,
        }
        : {
          id: undefined,
          pose_name: pose ?? 'keep the subject pose unchanged',
          lighting_name: lighting ?? 'match the original photo lighting',
          background_name: background ?? 'keep the original background',
          style_pack: 'candid_iphone',
          background_focus: 'moderate_bokeh',
        }

      // ═══════════════════════════════════════════════════════════════
      // PRODUCTION PIPELINE MODE (ChatGPT Image 1.5 + Face Preservation)
      // ═══════════════════════════════════════════════════════════════
      // Enable production pipeline via:
      // - model: 'production' (explicit)
      // - useProductionPipeline: true in request body
      const useProductionPipeline = model === 'production' || body.useProductionPipeline === true

      if (useProductionPipeline) {
        console.log('\n')
        console.log('╔═══════════════════════════════════════════════════════════════════════════════╗')
        console.log('║  🎯 PRODUCTION PIPELINE MODE ENABLED                                          ║')
        console.log('║  Model: ChatGPT Image 1.5 + GPT-4o-mini                                      ║')
        console.log('║  Features: 6-stage face preservation, pixel-level face copy                  ║')
        console.log('╚═══════════════════════════════════════════════════════════════════════════════╝')
        console.log('\n')

        try {
          const productionResult = await runProductionTryOnPipeline({
            personImageBase64: normalizedPerson,
            garmentImageBase64: normalizedClothing,
            sceneDescription: preset?.background_name,
            preset: preset ? {
              id: preset.id,
              background_name: preset.background_name,
              lighting_name: preset.lighting_name
            } : undefined,
            userRequest
          })

          // Save result to storage
          let imageUrl: string | null = null
          const imagePath = `tryon/${dbUser.id}/${job.id}_production.png`

          try {
            if (productionResult.image) {
              imageUrl = await saveUpload(productionResult.image, imagePath, 'try-ons')
              console.log(`✓ Production result saved to storage`)
            }
          } catch (saveErr) {
            console.warn('⚠️ Failed to save to storage, using base64')
          }

          // ═══════════════════════════════════════════════════════════════
          // PHASE 2: Complete generation tracking (success)
          // ═══════════════════════════════════════════════════════════════
          completeGeneration(
            dbUser.id,
            generationRequestId,
            productionResult.success ? 'success' : 'failed',
            1  // 1 Gemini call
          )

          // Update job status
          await prisma.generationJob.update({
            where: { id: job.id },
            data: {
              status: productionResult.success ? 'completed' : 'completed_with_warnings',
              outputImagePath: imageUrl || 'base64://production',
              suggestionsJSON: {
                pipeline: 'production-v2',
                status: productionResult.status,
                faceOverwritten: productionResult.debug.faceOverwritten,
                totalTimeMs: productionResult.debug.totalTimeMs,
                warnings: productionResult.warnings
              }
            }
          })

          return NextResponse.json({
            success: productionResult.success,
            jobId: job.id,
            imageUrl: imageUrl || undefined,
            base64Image: productionResult.image,
            status: productionResult.status,
            warnings: productionResult.warnings,
            remainingToday: gateResult.remainingToday - 1,
            variants: [{
              imageUrl: imageUrl || undefined,
              base64Image: productionResult.image,
              variantId: 0,
              label: 'Production (Face Overwritten)'
            }],
            debug: {
              pipeline: 'production-v2',
              faceOverwritten: productionResult.debug.faceOverwritten,
              totalTimeMs: productionResult.debug.totalTimeMs,
              stages: productionResult.debug.stages.length
            }
          })
        } catch (productionError) {
          console.error('❌ Production pipeline failed:', productionError)

          // ═══════════════════════════════════════════════════════════════
          // PHASE 2: Complete generation tracking (failure)
          // ═══════════════════════════════════════════════════════════════
          completeGeneration(dbUser.id, generationRequestId, 'failed', 0)

          // Update job with error
          await prisma.generationJob.update({
            where: { id: job.id },
            data: {
              status: 'failed',
              error: productionError instanceof Error ? productionError.message : 'Production pipeline failed'
            }
          })

          // Return error with helpful message
          return NextResponse.json({
            success: false,
            error: 'Production pipeline failed. Try again or use standard mode.',
            details: productionError instanceof Error ? productionError.message : undefined
          }, { status: 500 })
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // STANDARD GEMINI PIPELINE (Fallback / Default)
      // ═══════════════════════════════════════════════════════════════
      // Generate 3 variants in parallel for user selection
      const VARIANT_COUNT = 3
      console.log(`🎬 Generating ${VARIANT_COUNT} variants in parallel (Gemini pipeline)...`)

      const variantPromises = Array.from({ length: VARIANT_COUNT }, (_, variantIndex) =>
        (async () => {
          const MAX_RETRIES = 2
          const RETRY_DELAYS = [1000, 2000]

          let result: Awaited<ReturnType<typeof runTryOnPipelineV3>> | null = null
          let lastError: Error | null = null

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`🔄 Variant ${variantIndex + 1}: Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]))
              }

              // Get variant-specific settings
              const variantSpec = getVariantSpec(variantIndex)
              logVariantGeneration(job.id, variantSpec)

              // IPCR-X: Get variant letter for pipeline-v4
              const variantLetter = (['A', 'B', 'C'] as Variant[])[variantIndex]

              // Build pipeline-v4 prompt with identity layers
              const pipelineOutput = buildPipelineV4({
                sessionId: `${job.id}_v${variantLetter}`,
                modelMode: model === 'pro' ? 'pro' : 'flash',
                presetId: stylePreset || 'keep_original',
                userRequest: userRequest,
                variant: variantLetter
              })

              // Run Intelligent RAG System (Real-world data, face copy, camera, lighting, physics)
              let ragContext = ''
              try {
                if (personImage && clothingImage) {
                  const userAnalysis = await analyzeUserImage(personImage)
                  const garmentClassification = await classifyGarment(clothingImage)
                  const ragResult = await runIntelligentRAG({
                    userAnalysis,
                    garmentClassification
                  })
                  // Use RAG summary only (not full context) to save tokens
                  ragContext = ragResult.ragSummary || ''
                  if (ragContext.length > 1000) {
                    ragContext = ragContext.substring(0, 1000) + '... [truncated for token limit]'
                  }
                  logIntelligentRAGStatus(`${job.id}_v${variantLetter}`, ragResult)
                  console.log(`   ⚠️ Using RAG summary only (${ragContext.length} chars) to prevent token overflow`)
                }
              } catch (ragError) {
                console.warn('⚠️ RAG system failed, continuing without RAG context:', ragError)
                // Continue without RAG - real-world data will still be included
                const { formatRealWorldRAGData } = await import('@/lib/tryon/rag/real-world-data')
                ragContext = formatRealWorldRAGData()
              }

              // IPCR-X: Full prompt chain
              // ORDER: Strict Enforcement (Highest Priority) → Absolute Face Freeze → Naturalism Enforcement → Unified Identity System → Face-Realism-Garment Master → Cross-Variant Face Consistency → Intelligent RAG → Identity-Garment-Realism → Photographic Compositor → Body Scan → Garment Scan → Physics → CBN-ST → Identity Layers → Variant → Verification
              // Strict Enforcement is the absolute highest priority - it cannot be overridden
              const isPro = model === 'pro'
              const strictEnforcement = getStrictIdentityEnforcement() // HIGHEST PRIORITY - FIRST
              const faceUltraLock = getFaceUltraLock() // FACE ULTRA LOCK (ABSOLUTE ZERO DRIFT)
              const garmentUltraLock = getGarmentUltraLock() // GARMENT ULTRA LOCK (ABSOLUTE EXACT MATCH)
              const faceFreezeConcise = getFaceFreezeConcise() // FACE FREEZE CONCISE (TOKEN-EFFICIENT, ZERO DRIFT)
              // Note: Removed verbose modules to prevent token overflow - using concise versions instead
              // const naturalismEnforcement = getNaturalismEnforcement() // TOO VERBOSE - REMOVED
              // const unifiedIdentity = getUnifiedIdentitySystem() // TOO VERBOSE - REMOVED
              // const personFirst = getPersonFirstGeneration() // TOO VERBOSE - REMOVED
              // const faceBodyConnection = getFaceBodyConnection() // TOO VERBOSE - REMOVED
              // const faceRealismGarmentMaster = getFaceRealismGarmentMaster() // TOO VERBOSE - REMOVED
              // const crossVariantFaceConsistency = getCrossVariantFaceConsistency() // TOO VERBOSE - REMOVED
              // const variantFaceReminder = getVariantFaceReminder(variantLetter) // TOO VERBOSE - REMOVED
              const identityGarmentRealism = getIdentityGarmentRealismConstraints() // COMPREHENSIVE PRIORITY SYSTEM
              const photographicCompositor = getPhotographicCompositorConstraints()
              const bodyScanPrompt = getBodyScanPrompt()
              const garmentScanPrompt = getGarmentScanPrompt()
              const fabricPhysicsPrompt = getFabricPhysicsPrompt()
              const cbnstPrompt = getCBNSTPrompt(isPro)
              const identityLayers = getIdentityLayersPrompt()

              // Log system activation
              logStrictEnforcementStatus(`${job.id}_v${variantLetter}`)
              logFaceGarmentUltraLockStatus(`${job.id}_v${variantLetter}`)
              logFaceFreezeConciseStatus(`${job.id}_v${variantLetter}`)
              logIdentityGarmentRealismStatus(`${job.id}_v${variantLetter}`)
              logPhotographicCompositorStatus(`${job.id}_v${variantLetter}`)
              logBodyScanStatus(`${job.id}_v${variantLetter}`)
              logGarmentScanStatus(`${job.id}_v${variantLetter}`)
              logFabricPhysicsStatus(`${job.id}_v${variantLetter}`)
              logCBNSTStatus(`${job.id}_v${variantLetter}`, isPro)

              // Get preset prompt directly from scene spec instead of extracting from pipelineOutput
              let presetPromptSection = ''
              if (stylePreset && preset) {
                const sceneSpec = getSceneById(stylePreset)
                if (sceneSpec) {
                  presetPromptSection = buildScenePrompt(sceneSpec)
                  console.log(`   🎨 Preset Scene Spec: FOUND (${sceneSpec.name})`)
                } else {
                  // Fallback: Build scene description from preset fields
                  presetPromptSection = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║  SCENE: ${stylePreset}
╚═══════════════════════════════════════════════════════════════════════════════╝

Location: ${preset.background_name || 'keep original background'}

LIGHTING:
• Type: ${preset.lighting_name || 'natural lighting'}
• Apply lighting consistently across scene and subject

BACKGROUND:
• ${preset.background_name || 'keep original background'}
• Maintain realistic depth and perspective
• Include natural clutter and imperfections

CAMERA:
• Use phone camera realism
• Natural framing and perspective
• Avoid studio perfection

REQUIREMENTS:
• Build the scene as specified above
• Apply lighting uniformly
• Maintain photographic realism
`
                  console.log(`   🎨 Preset Scene Spec: NOT FOUND, using preset fields (${preset.background_name || 'default'})`)
                }
              }

              // Build complete prompt: Strict Enforcement (FIRST) → Face Ultra Lock → Garment Ultra Lock → Face Freeze Concise (REPEATED 3X) → Identity-Garment-Realism → Photographic Compositor → Body Scan → Garment Scan → Physics → CBN-ST → Identity Layers → Preset → Variant → Verification → Ultra Locks (FINAL)
              // Note: Ultra locks are at the start and end, with face freeze repeated 3 times for maximum enforcement
              let variantPromptAddition = `${strictEnforcement}\n\n${faceUltraLock}\n\n${garmentUltraLock}\n\n${faceFreezeConcise}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFACE & GARMENT REMINDER #1: COPY FACE FROM IMAGE 1. COPY GARMENT FROM IMAGE 2. NO DRIFT.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${faceFreezeConcise}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFACE & GARMENT REMINDER #2: FACE FROM IMAGE 1 = OUTPUT FACE. GARMENT FROM IMAGE 2 = OUTPUT GARMENT.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${ragContext ? `${ragContext}\n\n` : ''}${identityGarmentRealism}\n\n${photographicCompositor}\n\n${bodyScanPrompt}\n\n${garmentScanPrompt}\n\n${fabricPhysicsPrompt}\n\n${cbnstPrompt}\n\n${identityLayers}\n\n${presetPromptSection ? `════════════════════════════════════════════════════════════════════════════════\nSCENE PRESET:\n════════════════════════════════════════════════════════════════════════════════\n${presetPromptSection}\n\n` : ''}${VARIANT_IDENTITY_LOCK}\n\n${buildVariantPromptModifier(variantSpec)}\n\n${IDENTITY_VERIFICATION_SUFFIX}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFINAL FACE & GARMENT ULTRA LOCK: COPY FACE FROM IMAGE 1. COPY GARMENT FROM IMAGE 2. DRIFT = FAILURE.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${faceUltraLock}\n\n${garmentUltraLock}\n\n${faceFreezeConcise}`

              // Token safety check: Estimate tokens (rough: 4 chars per token)
              const estimatedTokens = variantPromptAddition.length / 4
              if (estimatedTokens > 30000) {
                console.warn(`   ⚠️ WARNING: Estimated tokens (${Math.round(estimatedTokens)}) approaching 32K limit!`)
                // Truncate if needed (reserve ~2K tokens for safety)
                const maxLength = 120000 // ~30K tokens
                if (variantPromptAddition.length > maxLength) {
                  variantPromptAddition = variantPromptAddition.substring(0, maxLength) + '\n\n[TRUNCATED - Token limit protection]'
                  console.warn(`   ⚠️ Prompt truncated to ${variantPromptAddition.length} chars to prevent overflow`)
                }
              }
              console.log(`   📊 Prompt size: ${variantPromptAddition.length} chars (estimated ${Math.round(estimatedTokens)} tokens)`)

              console.log(`🎬 Running variant ${variantSpec.id} - ${variantSpec.name} (attempt ${attempt + 1})...`)
              console.log(`   🌡️ Temperature: ${pipelineOutput.temperature}`)
              console.log(`   🔒 STRICT ENFORCEMENT: ACTIVE (Highest Priority - Absolute Rules)`)
              console.log(`   🔒🔒🔒 FACE & GARMENT ULTRA LOCK: ACTIVE (Absolute zero drift tolerance)`)
              console.log(`   🧊 Face Freeze Concise: ACTIVE (Zero drift tolerance, token-efficient)`)
              console.log(`   🧠 Intelligent RAG: ACTIVE (Real-world data, face copy, camera, lighting, physics)`)
              console.log(`   🎯 Identity-Garment-Realism: ACTIVE (Comprehensive Priority System)`)
              console.log(`   📸 Photographic Compositor: ACTIVE (Core Override System)`)
              console.log(`   ⚠️ Note: Some verbose modules removed to prevent token overflow (32K limit)`)
              console.log(`   🔬 Body Scan: ACTIVE (Direct Body Copy from Image 1)`)
              console.log(`   👔 Garment Scan: ACTIVE (Clothing Extraction)`)
              console.log(`   🧵 Fabric Physics: ACTIVE (Gravity, Wrinkles, Fit)`)
              console.log(`   🛡️ CBN-ST™: ACTIVE (Clothing Body Neutralization)`)
              console.log(`   🔒 Identity Layers: ACTIVE`)

              result = await runTryOnPipelineV3({
                subjectImageBase64: normalizedPerson,
                clothingRefBase64: normalizedClothing,
                preset,
                userRequest: userRequest ? `${userRequest}\n\n${variantPromptAddition}` : variantPromptAddition,
                quality: {
                  quality: model === 'pro' ? 'high' : 'fast',
                  aspectRatio: (reqAspectRatio || '4:5') as any,
                  resolution: (reqResolution || '2K') as any,
                },
              })
              break
            } catch (err) {
              lastError = err instanceof Error ? err : new Error(String(err))
              console.error(`❌ Variant ${variantIndex + 1} attempt ${attempt + 1} failed:`, lastError.message)
              if (lastError.message.includes('Invalid') ||
                lastError.message.includes('required') ||
                lastError.message.includes('Unauthorized')) {
                break
              }
            }
          }

          if (!result) {
            console.error(`❌ Variant ${variantIndex + 1} failed completely`)
            return null
          }

          return { variantIndex, result }
        })()
      )

      const variantResults = await Promise.all(variantPromises)
      const successfulVariants = variantResults.filter(v => v !== null) as Array<{ variantIndex: number, result: Awaited<ReturnType<typeof runTryOnPipelineV3>> }>

      if (successfulVariants.length === 0) {
        throw new Error('All variant generations failed. Please try again.')
      }

      console.log(`✅ Generated ${successfulVariants.length}/${VARIANT_COUNT} variants successfully`)

      // Save all variants and build response
      const variants: Array<{ imageUrl?: string; base64Image: string; variantId: number; label: string }> = []

      for (const { variantIndex, result } of successfulVariants) {
        const generatedImage = result.image
        const variantSpec = getVariantSpec(variantIndex)
        const imagePath = `tryon/${dbUser.id}/${job.id}_v${variantSpec.id}.png`
        let imageUrl: string | null = null

        try {
          imageUrl = await saveUpload(generatedImage, imagePath, 'try-ons')
          console.log(`✓ Variant ${variantSpec.id} saved to storage`)
        } catch (err) {
          console.warn(`⚠️ Variant ${variantSpec.id} storage failed, using base64`)
        }

        variants.push({
          imageUrl: imageUrl || undefined,
          base64Image: generatedImage,
          variantId: variantIndex,
          label: variantSpec.label, // e.g. "Warm • Medium"
        })
      }

      // Use first variant as primary
      const primaryVariant = variants[0]

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          outputImagePath: primaryVariant.imageUrl || 'base64://' + primaryVariant.base64Image.substring(0, 50) + '...',
          suggestionsJSON: {
            presetId: stylePreset || null,
            presetName: presetV3?.name || null,
            prompt_text: successfulVariants[0].result.debug.shootPlanText,
            timeMs: successfulVariants[0].result.debug.timeMs,
            variantCount: variants.length,
          },
        },
      })

      return NextResponse.json({
        success: true,
        jobId: job.id,
        imageUrl: primaryVariant.imageUrl || undefined,
        base64Image: primaryVariant.base64Image,
        variants: variants, // All 3 variants for UI selection
        preset: presetV3
          ? {
            id: presetV3.id,
            name: presetV3.name,
            category: presetV3.category,
          }
          : null,
      })
    } catch (error) {
      console.error('❌ Try-on generation failed for job:', job.id)
      console.error('Error:', error)

      // Update job with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      try {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: errorMessage,
          },
        })
      } catch (updateError) {
        console.error('Failed to update job status:', updateError)
      }

      // Provide user-friendly error messages
      let userMessage = errorMessage
      if (errorMessage.includes('prompt')) {
        userMessage = 'Unable to build edit instructions. Please try again.'
      } else if (errorMessage.includes('generate') || errorMessage.includes('Gemini')) {
        userMessage = 'Image generation service is experiencing issues. Please try again in a moment.'
      }

      throw new Error(userMessage)
    }
  } catch (error) {
    console.error('Try-on generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
