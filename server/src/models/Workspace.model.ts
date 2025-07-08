// src/models/Workspace.model.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface representing a document in MongoDB.
export interface IWorkspace extends Document {
    instance: string;
    workspaceID: number;
    eonID?: string; // Optional as it might not always be present or relevant for all queries
    readRow?: string;
    writeRow?: string;
    archived: string; // Based on your sample data 'true'/'false' as strings
    // If 'archived' is boolean in DB, change type to boolean
    // createdAt?: Date; // Example: if you had timestamps
    // updatedAt?: Date;
}

// Schema corresponding to the document interface.
const WorkspaceSchema: Schema = new Schema({
    instance: {
        type: String,
        required: true,
    },
    workspaceID: {
        type: Number,
        required: true,
        unique: true, // Assuming workspaceID should be unique
    },
    eonID: {
        type: String,
    },
    readRow: {
        type: String,
    },
    writeRow: {
        type: String,
    },
    archived: {
        type: String, // Or Boolean, if it's actually boolean in the DB
        required: true,
        default: 'false',
    },
    // Example for timestamps:
    // createdAt: { type: Date, default: Date.now },
    // updatedAt: { type: Date, default: Date.now }
}, {
    // versionKey: false // Disables the __v field if you don't need it
    // timestamps: true // Mongoose will add createdAt and updatedAt fields
});

// Export the Mongoose model.
// The third argument 'workspace' is the actual collection name in MongoDB.
export default mongoose.model<IWorkspace>('Workspace', WorkspaceSchema, 'workspace');