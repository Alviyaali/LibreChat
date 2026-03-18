import { Schema } from 'mongoose';
import type { IContact } from '~/types';

const contactSchema = new Schema<IContact>(
    {
        name: {
            type: String,
            index: true, // index is for searching
        },
        company: {
            type: String,
            index: true, // index is for searching
        },
        role: {
            type: String,
        },
        email: {
            type: String,
            index: true, // index is for searching
        },
        phone: {
            type: String,
            index: true, // index is for searching
        },
        notes: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true },
);

contactSchema.index({ company: 1, name: 1}); // index is for searching
export default contactSchema;