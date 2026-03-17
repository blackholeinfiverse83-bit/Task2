/**
 * ScrapedNews model — bound to the NEWS database (this project's own)
 */
import mongoose, { Schema, Document } from 'mongoose'
import { getNewsDb } from '@/lib/mongodb'

export interface IScrapedNews extends Document {
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
    created_at: Date
    updated_at: Date
}

const scrapedNewsSchema = new Schema<IScrapedNews>(
    {
        customId: { type: String, unique: true, sparse: true },
        title: String,
        description: String,
        url: { type: String, required: true, unique: true },
        source: String,
        category: String,
        imageUrl: String,
        publishedAt: String,
        readTime: String,
        scrapedAt: String,
        scrapedData: Schema.Types.Mixed,
        summary: String,
        insights: Schema.Types.Mixed,
        relatedVideos: Schema.Types.Mixed,
        storedAt: String,
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'scraped_news',
    }
)

let ScrapedNewsModel: mongoose.Model<IScrapedNews> | null = null

export async function getScrapedNewsModel(): Promise<mongoose.Model<IScrapedNews>> {
    if (ScrapedNewsModel) return ScrapedNewsModel
    const conn = await getNewsDb()
    ScrapedNewsModel =
        conn.models.ScrapedNews || conn.model<IScrapedNews>('ScrapedNews', scrapedNewsSchema)
    return ScrapedNewsModel
}
