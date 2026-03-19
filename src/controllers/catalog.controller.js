import pool from '../config/db.js';

// GET /api/v1/catalog/gifts
export const getGiftCatalog = async (req, res) => {
    try {
        const result = await pool.query("SELECT gift_id, gift_name, diamond_count, image_url FROM gift_catalog ORDER BY diamond_count DESC");
        return res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi getGiftCatalog:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};
