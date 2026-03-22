import mongoose from 'mongoose';

const WebhookLogSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    response_code: { type: Number },
    response_body: { type: String },
    created_at: { type: Date, default: Date.now }
}, {
    versionKey: false
});

WebhookLogSchema.index({ user_id: 1, created_at: -1 });

const WebhookLog = mongoose.model('WebhookLog', WebhookLogSchema);

export default WebhookLog;
