import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(['INFLUENCER', 'BRAND']),
    name: z.string().optional(),
})

export async function POST(request: Request) {
    try {
        // Validate environment
        if (!process.env.DATABASE_URL) {
            return NextResponse.json(
                { error: 'Database configuration missing' },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { id, email, role, name } = registerSchema.parse(body)

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            )
        }

        // Generate unique slug
        const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

        // Create user and profile based on role
        const user = await prisma.user.create({
            data: {
                id,
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
                            },
                        },
                    }
                    : {
                        brandProfile: {
                            create: {
                                companyName: name || 'New Brand',
                            },
                        },
                    }),
            },
            include: {
                influencerProfile: role === 'INFLUENCER',
                brandProfile: role === 'BRAND',
            },
        })

        // If influencer, create pending application in Supabase
        if (role === 'INFLUENCER') {
            try {
                const supabase = await createClient()
                const { error: appError } = await supabase
                    .from('influencer_applications')
                    .insert({
                        user_id: id,
                        email: email,
                        full_name: name || null,
                        status: 'pending',
                    })

                if (appError) {
                    console.error('Failed to create influencer application:', appError)
                    // Don't fail registration if application creation fails
                    // Admin can manually create it if needed
                }
            } catch (appErr) {
                console.error('Error creating influencer application:', appErr)
                // Continue - registration succeeded even if application creation failed
            }
        }

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error('Registration error:', error)
        
        // Better error handling
        let errorMessage = 'Internal server error'
        let statusCode = 500
        
        if (error instanceof Error) {
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
            }
        }
        
        return NextResponse.json(
            { error: errorMessage },
            { status: statusCode }
        )
    }
}
