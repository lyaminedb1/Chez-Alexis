// ============================================================
// Loyalty Card API — Supabase
//
// POST /api/loyalty        → créer une carte
// GET  /api/loyalty?id=CA-XXXX → lire une carte
// PATCH /api/loyalty       → ajouter un tampon (admin seulement)
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOTAL_STAMPS = 10;

function generateCardId() {
  return 'CA-' + String(Math.floor(1000 + Math.random() * 9000));
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  // ── GET — récupérer une carte ──────────────────────────────
  if (event.httpMethod === 'GET') {
    const cardId = event.queryStringParameters?.id;
    if (!cardId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'id manquant' }) };
    }

    const { data, error } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('card_id', cardId)
      .single();

    if (error || !data) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Carte introuvable' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  // ── POST — créer une carte ─────────────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
    }

    const { nom, email, telephone } = body;
    if (!nom || !email) {
      return { statusCode: 422, headers, body: JSON.stringify({ error: 'nom et email requis' }) };
    }

    // Vérifier si email déjà inscrit
    const { data: existing } = await supabase
      .from('loyalty_cards')
      .select('card_id, tampons')
      .eq('email', email)
      .single();

    if (existing) {
      return { statusCode: 200, headers, body: JSON.stringify({ ...existing, already_exists: true }) };
    }

    const cardId = generateCardId();
    const { data, error } = await supabase
      .from('loyalty_cards')
      .insert({ nom, email, telephone: telephone || null, card_id: cardId, tampons: 0 })
      .select()
      .single();

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur création carte' }) };
    }

    return { statusCode: 201, headers, body: JSON.stringify(data) };
  }

  // ── PATCH — ajouter un tampon (admin) ──────────────────────
  if (event.httpMethod === 'PATCH') {
    // Vérifier le mot de passe admin
    const adminKey = event.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorisé' }) };
    }

    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
    }

    const { card_id, action } = body; // action: 'add' | 'reset'

    const { data: card } = await supabase
      .from('loyalty_cards')
      .select('tampons')
      .eq('card_id', card_id)
      .single();

    if (!card) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Carte introuvable' }) };
    }

    let nouveauxTampons;
    if (action === 'reset') {
      nouveauxTampons = 0;
    } else {
      nouveauxTampons = Math.min(card.tampons + 1, TOTAL_STAMPS);
    }

    const { data: updated, error } = await supabase
      .from('loyalty_cards')
      .update({ tampons: nouveauxTampons, updated_at: new Date().toISOString() })
      .eq('card_id', card_id)
      .select()
      .single();

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur mise à jour' }) };
    }

    const reward = nouveauxTampons >= TOTAL_STAMPS;
    return { statusCode: 200, headers, body: JSON.stringify({ ...updated, reward }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
