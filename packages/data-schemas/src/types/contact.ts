import type { Document, Types } from 'mongoose';

export interface IContact extends Document {
    name?: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateContactRequest {
    name?: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdBy?: string | Types.ObjectId;
}

export interface ContactFilterOptions{
    search?: string;
    page?: number;
    limit?: number;
}