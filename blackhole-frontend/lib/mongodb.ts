/**
 * Dual MongoDB connection manager
 * - authDb: shared auth database (users, sessions) — same as the other project
 * - newsDb: this project's news storage database
 */
import mongoose from 'mongoose'

// Cache connections to prevent multiple connections in dev (hot-reload)
const cached: {
    authConn: mongoose.Connection | null
    newsConn: mongoose.Connection | null
    authPromise: Promise<mongoose.Connection> | null
    newsPromise: Promise<mongoose.Connection> | null
} = {
    authConn: null,
    newsConn: null,
    authPromise: null,
    newsPromise: null,
}

/**
 * Get the Auth DB connection (shared with the other project)
 */
export async function getAuthDb(): Promise<mongoose.Connection> {
    if (cached.authConn) return cached.authConn

    if (!cached.authPromise) {
        const uri = process.env.MONGODB_AUTH_URI
        if (!uri) {
            throw new Error('MONGODB_AUTH_URI environment variable is not set')
        }
        cached.authPromise = mongoose
            .createConnection(uri)
            .asPromise()
            .then((conn) => {
                console.log('✓ MongoDB Auth DB connected')
                cached.authConn = conn
                return conn
            })
    }

    return cached.authPromise
}

/**
 * Get the News DB connection (this project's own)
 */
export async function getNewsDb(): Promise<mongoose.Connection> {
    if (cached.newsConn) return cached.newsConn

    if (!cached.newsPromise) {
        const uri = process.env.MONGODB_NEWS_URI
        if (!uri) {
            throw new Error('MONGODB_NEWS_URI environment variable is not set')
        }
        cached.newsPromise = mongoose
            .createConnection(uri)
            .asPromise()
            .then((conn) => {
                console.log('✓ MongoDB News DB connected')
                cached.newsConn = conn
                return conn
            })
    }

    return cached.newsPromise
}

/**
 * Disconnect both databases
 */
export async function disconnectAll(): Promise<void> {
    if (cached.authConn) {
        await cached.authConn.close()
        cached.authConn = null
        cached.authPromise = null
    }
    if (cached.newsConn) {
        await cached.newsConn.close()
        cached.newsConn = null
        cached.newsPromise = null
    }
    console.log('✓ MongoDB connections closed')
}
