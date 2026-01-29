// Test using the app's configured Prisma client
import prisma from '../src/lib/prisma'

async function testConnection() {
    try {
        console.log('Testing Prisma connection with app client...')
        const count = await prisma.user.count()
        console.log(`✅ Connection successful. User count: ${count}`)
        return true
    } catch (e: any) {
        console.error('❌ Connection failed:', e.message)
        return false
    }
}

testConnection().then((success) => {
    process.exit(success ? 0 : 1)
})
