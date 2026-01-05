import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['INFLUENCER', 'BRAND']),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const tryOnSchema = z.object({
  personImage: z.string(),
  personImages: z.array(z.string()).optional(), // Additional person images for Pro model
  editType: z
    .enum(['clothing_change', 'background_change', 'lighting_change', 'pose_change', 'camera_change'])
    .optional()
    .default('clothing_change'),
  clothingImage: z.string().optional(),
  backgroundImage: z.string().optional(),
  // NEW: Accessory support for edit mode
  accessoryImages: z.array(z.string()).optional(), // Array of base64 accessory images
  accessoryTypes: z.array(z.enum(['purse', 'shoes', 'hat', 'jewelry', 'bag', 'watch', 'sunglasses', 'scarf', 'other'])).optional(),
  model: z.enum(['flash', 'pro', 'production']).optional().default('production'),
  stylePreset: z.string().optional(),
  userRequest: z.string().optional(),
  background: z.string().optional(),
  pose: z.string().optional(),
  expression: z.string().optional(),
  camera: z.string().optional(),
  lighting: z.string().optional(),
  addOns: z.array(z.string()).optional(),
  // New fields for user-configurable quality
  aspectRatio: z.enum(['1:1', '4:5', '3:4', '9:16']).optional().default('4:5'),
  resolution: z.enum(['1K', '2K', '4K']).optional().default('2K'),
})

export const adGenerationSchema = z.object({
  productImage: z.string().optional(),
  influencerImage: z.string().optional(),
  stylePreferences: z.string().optional(),
  campaignGoals: z.array(z.string()).optional(),
})

export const campaignSchema = z.object({
  title: z.string().min(1),
  goals: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  budget: z.number().optional(),
  timeline: z.string().optional(),
})

export const collaborationSchema = z.object({
  influencerId: z.string(),
  budget: z.number().optional(),
  timeline: z.string().optional(),
  goals: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
  link: z.string().url().optional(),
  imagePath: z.string().optional(),
  tags: z.string().optional(),
  audience: z.string().optional(),
  images: z
    .array(
      z.object({
        imagePath: z.string(),
        order: z.number(),
        isTryOnReference: z.boolean(),
        isCoverImage: z.boolean(),
      })
    )
    .optional(),
})

export const createLinkSchema = z.object({
  productId: z.string().min(1),
})

export const linkAnalyticsQuerySchema = z.object({
  productId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

