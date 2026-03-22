import mongoose from 'mongoose';

const CloudLogSchema = new mongoose.Schema({
    session_id: { type: String, required: true },
    type: { type: String, required: true }, // 'chat', 'gift', 'like', 'member'
    sender_name: { type: String },
    content: { type: String },
    quantity: { type: Number, default: 1 },
    json_raw: { type: mongoose.Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now }
}, {
    versionKey: false,
    timestamps: false // We use created_at manually to match PostgreSQL
});

// Index to optimize common queries
CloudLogSchema.index({ session_id: 1, created_at: 1 });
CloudLogSchema.index({ session_id: 1, type: 1 });

const CloudLog = mongoose.model('CloudLog', CloudLogSchema);

export default CloudLog;
