/**
 * User model — bound to the AUTH database (shared with the other project)
 * Schema matches the other project's user collection for cross-project auth
 */
import mongoose, { Schema, Document } from 'mongoose'
import { getAuthDb } from '@/lib/mongodb'

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId
    email: string
    password: string       // bcrypt hash
    name: string
    full_name?: string     // alias for compatibility with the other project
    role: string           // e.g. STUDENT, TEACHER, ADMIN
    is_active: boolean
    is_email_verified: boolean
    created_at: Date
    updated_at: Date
    last_login_at?: Date
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            default: '',
        },
        full_name: {
            type: String,
            default: '',
        },
        role: {
            type: String,
            default: 'STUDENT',
            enum: ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'],
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        is_email_verified: {
            type: Boolean,
            default: false,
        },
        last_login_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        collection: 'users',
    }
)

// Cached model — prevent re-compilation on hot reload
let UserModel: mongoose.Model<IUser> | null = null

export async function getUserModel(): Promise<mongoose.Model<IUser>> {
    if (UserModel) return UserModel
    const conn = await getAuthDb()
    UserModel = conn.models.User || conn.model<IUser>('User', userSchema)
    return UserModel
}
