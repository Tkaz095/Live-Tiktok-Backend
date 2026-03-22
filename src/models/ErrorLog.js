import mongoose from 'mongoose';

const ErrorLogSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    type: { type: String }, // 'API_ERROR', 'WS_ERROR', etc.
    message: { type: String, required: true },
    stack: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    occurred_at: { type: Date, default: Date.now }
}, {
    versionKey: false
});

ErrorLogSchema.index({ user_id: 1, occurred_at: -1 });

const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);

export default ErrorLog;
