/**
 * Database helper functions
 * Replaces Firestore — all server-side DB operations go through MongoDB
 *
 * Auth operations → auth DB (shared with the other project)
 * News operations → news DB (this project's own)
 */
import { getUserModel, IUser } from '@/models/User'
import { getScrapedNewsModel } from '@/models/ScrapedNews'

// ============ USER OPERATIONS (Auth DB) ============

export interface UserProfile {
    id: string
    email: string
    name?: string
    isEmailVerified: boolean
    createdAt: string
    updatedAt: string
    lastLoginAt?: string
    isActive: boolean
}

function userDocToProfile(doc: IUser): UserProfile {
    return {
        id: doc._id.toString(),
        email: doc.email,
        name: doc.name || doc.full_name || '',
        isEmailVerified: doc.is_email_verified,
        createdAt: doc.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: doc.updated_at?.toISOString() || new Date().toISOString(),
        lastLoginAt: doc.last_login_at?.toISOString(),
        isActive: doc.is_active,
    }
}

export async function createUserProfile(
    uid: string,
    data: { email: string; name?: string }
): Promise<UserProfile> {
    const User = await getUserModel()

    // Check if user already exists by ID or email
    let user = await User.findById(uid)
    if (!user) {
        user = await User.findOne({ email: data.email })
    }

    if (user) {
        // Update existing
        user.name = data.name || user.name
        user.full_name = data.name || user.full_name
        await user.save()
        return userDocToProfile(user)
    }

    // Create new (shouldn't normally happen — signup creates users)
    user = await User.create({
        email: data.email,
        name: data.name || data.email.split('@')[0],
        full_name: data.name || data.email.split('@')[0],
        password: '', // placeholder — actual password set during signup
        role: 'STUDENT',
        is_active: true,
        is_email_verified: false,
    })
    return userDocToProfile(user)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const User = await getUserModel()
    const user = await User.findById(uid).select('-password')
    if (!user) return null
    return userDocToProfile(user)
}

export async function updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
): Promise<void> {
    const User = await getUserModel()

    const mongoUpdates: Record<string, any> = { updated_at: new Date() }
    if (updates.name !== undefined) {
        mongoUpdates.name = updates.name
        mongoUpdates.full_name = updates.name
    }
    if (updates.lastLoginAt !== undefined) {
        mongoUpdates.last_login_at = new Date(updates.lastLoginAt)
    }
    if (updates.isActive !== undefined) {
        mongoUpdates.is_active = updates.isActive
    }
    if (updates.isEmailVerified !== undefined) {
        mongoUpdates.is_email_verified = updates.isEmailVerified
    }

    await User.findByIdAndUpdate(uid, mongoUpdates)
}

// ============ SCRAPED NEWS OPERATIONS (News DB) ============

export interface ScrapedNewsItem {
    id: string
    customId?: string
    title?: string
    description?: string
    url: string
    source?: string
    category?: string
    imageUrl?: string
    publishedAt?: string
    readTime?: string
    scrapedAt?: string
    scrapedData?: any
    summary?: string
    insights?: any
    relatedVideos?: any
    storedAt?: string
    createdAt: string
    updatedAt: string
}

export async function getScrapedNews(page = 1, limit = 20) {
    const ScrapedNews = await getScrapedNewsModel()

    const skip = (page - 1) * limit
    const total = await ScrapedNews.countDocuments()

    const docs = await ScrapedNews.find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    const articles = docs.map((doc: any) => ({
        id: doc._id.toString(),
        customId: doc.customId,
        title: doc.title,
        description: doc.description,
        url: doc.url,
        source: doc.source,
        category: doc.category,
        imageUrl: doc.imageUrl,
        publishedAt: doc.publishedAt,
        readTime: doc.readTime,
        relatedVideos: doc.relatedVideos,
    }))

    return {
        articles,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
}

export async function upsertScrapedNews(data: any) {
    const ScrapedNews = await getScrapedNewsModel()

    const now = new Date().toISOString()
    const articleData = {
        customId: data.id || data.customId,
        title: data.title,
        description: data.description,
        url: data.url,
        source: data.source,
        category: data.category,
        imageUrl: data.imageUrl,
        publishedAt: data.publishedAt,
        readTime: data.readTime,
        scrapedAt: data.scrapedAt,
        scrapedData: data.scrapedData || null,
        summary: data.summary,
        insights: data.insights || null,
        relatedVideos: data.relatedVideos || null,
        storedAt: now,
    }

    // Upsert by URL
    const result = await ScrapedNews.findOneAndUpdate(
        { url: data.url },
        { $set: articleData, $setOnInsert: { created_at: new Date() } },
        { upsert: true, new: true }
    )

    return {
        id: result._id.toString(),
        ...articleData,
        createdAt: result.created_at?.toISOString() || now,
    }
}

export async function deleteScrapedNews(idOrCustomId: string) {
    const ScrapedNews = await getScrapedNewsModel()
    // First try by customId
    let result = await ScrapedNews.findOneAndDelete({ customId: idOrCustomId })
    // If not found and it's a valid ObjectId, try _id
    if (!result && idOrCustomId.length === 24) {
        result = await ScrapedNews.findByIdAndDelete(idOrCustomId)
    }
    return { found: !!result }
}
