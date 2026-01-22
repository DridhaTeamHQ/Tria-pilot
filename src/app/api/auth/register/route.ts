import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z
    .object({
        id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(320),
        role: z.enum(['INFLUENCER', 'BRAND']),
        name: z.string().trim().max(120).optional(),
    })
    .strict()

export async function POST(request: Request) {
    try {
        // Validate environment
        if (!process.env.DATABASE_URL) {
            return NextResponse.json(
                { error: 'Database configuration missing' },
                { status: 500 }
            )
        }

        const body = await request.json().catch(() => null)
        const parsed = registerSchema.parse(body)
        // Normalize email: trim whitespace and convert to lowercase
        const email = parsed.email.trim().toLowerCase()
        const { id, role, name } = parsed

        // CRITICAL: Make signup idempotent
        // Check if user already exists by ID (matches auth.users.id)
        // This prevents duplicate creation if auth user exists but profile creation failed
        const existingUser = await prisma.user.findUnique({
            where: { id }, // Use ID, not email - auth.users.id MUST equal users.id
        })

        if (existingUser) {
            // User already exists - return existing user (idempotent)
            // This handles cases where auth user was created but profile creation was retried
            return NextResponse.json({ user: existingUser }, { status: 200 })
        }

        // Also check by email as a safety check (but don't fail if found with different ID)
        const existingByEmail = await prisma.user.findUnique({
            where: { email },
        })

        if (existingByEmail) {
            // Email exists but ID doesn't match - this is a data inconsistency
            // Log error but don't fail - return existing user
            console.error(`DATA INCONSISTENCY: Email ${email} exists with ID ${existingByEmail.id}, but auth user ID is ${id}`)
            return NextResponse.json({ user: existingByEmail }, { status: 200 })
        }

        // Generate unique slug
        const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

        // Create user and profile based on role
        // Use upsert pattern to handle race conditions
        const user = await prisma.user.upsert({
            where: { id }, // Primary key is ID (matches auth.users.id)
            update: {
                // If user exists, update only if needed (shouldn't happen, but defensive)
                email,
                name: name || undefined,
            },
            create: {
                id, // CRITICAL: Use auth.users.id, not generated ID
                email,
                role,
                slug: uniqueSlug,
                name: name || null,
                ...(role === 'INFLUENCER'
                    ? {
                        influencerProfile: {
                            create: {
                                niches: [],
                                socials: {},
                                onboardingCompleted: false, // CRITICAL: Default to false
                            },
                        },
                    }
                    : {
                        brandProfile: {
                            create: {
                                companyName: name || 'New Brand',
                                onboardingCompleted: false, // CRITICAL: Default to false
                            },
                        },
                    }),
            },
            include: {
                influencerProfile: role === 'INFLUENCER',
                brandProfile: role === 'BRAND',
            },
        })

        // CRITICAL: Do NOT create influencer_applications entry on registration
        // approvalStatus must remain 'none' until onboarding is completed
        // The application entry will be created in /api/onboarding/influencer when onboardingCompleted = true
        // This prevents impossible states where approvalStatus = 'pending' but onboardingCompleted = false

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error('Registration error:', error)
        
        // Better error handling
        let errorMessage = 'Internal server error'
        let statusCode = 500
        
        // Handle Zod validation errors
        if (error && typeof error === 'object' && 'issues' in error) {
            const zodError = error as { issues: Array<{ path: string[]; message: string }> }
            const firstError = zodError.issues[0]
            if (firstError) {
                errorMessage = `Invalid ${firstError.path.join('.')}: ${firstError.message}`
                statusCode = 400
            } else {
                errorMessage = 'Invalid request data. Please check your input and try again.'
                statusCode = 400
            }
        } else if (error instanceof Error) {
            errorMessage = error.message
            
            // Handle Prisma errors
            if (error.message.includes('Unique constraint') || error.message.includes('duplicate key')) {
                errorMessage = 'User with this email already exists'
                statusCode = 400
            } else if (error.message.includes('Foreign key constraint')) {
                errorMessage = 'Database constraint error'
            } else if (error.message.includes('Can\'t reach database')) {
                errorMessage = 'Database connection failed. Please check your database configuration.'
            } else if (error.message.includes('P2002')) {
                errorMessage = 'User with this email already exists'
                statusCode = 400
            } else if (error.message.includes('Invalid uuid')) {
                errorMessage = 'Invalid user ID format'
                statusCode = 400
            }
        }
        
        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode }
        )
    }
}
