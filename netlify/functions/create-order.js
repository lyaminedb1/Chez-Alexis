// ============================================================
// POST /api/create-order
// Sauvegarde une commande en base Supabase + envoie un email
// à Alexis via Resend
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const {
    nom, telephone, email,
    date_retrait, heure_retrait,
    produits, // array: [{ nom, quantite }]
    notes,
    carte_fidelite,
    paid // true si paiement Stripe déjà validé
  } = body;

  // Validation basique
  if (!nom || !telephone || !date_retrait || !heure_retrait || !produits?.length) {
    return {
      statusCode: 422,
      body: JSON.stringify({ error: 'Champs obligatoires manquants' })
    };
  }

  // 1. Insérer la commande en base
  const { data: order, error: dbError } = await supabase
    .from('orders')
    .insert({
      nom,
      telephone,
      email: email || null,
      date_retrait,
      heure_retrait,
      produits,
      notes: notes || null,
      carte_fidelite: carte_fidelite || null,
      statut: paid ? 'confirmed' : 'pending',
      paid: !!paid
    })
    .select()
    .single();

  if (dbError) {
    console.error('Supabase error:', dbError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur base de données' }) };
  }

  // 2. Si carte fidélité fournie → incrémenter le tampon
  if (carte_fidelite) {
    await supabase.rpc('increment_stamp', { card_id: carte_fidelite });
  }

  // 3. Envoyer un email de notification à Alexis via Resend
  if (process.env.RESEND_API_KEY) {
    const produitsHtml = produits
      .map(p => `<li><strong>${p.quantite}x</strong> ${p.nom}</li>`)
      .join('');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'commandes@chezalexis-boulangerie.fr',
        to: process.env.OWNER_EMAIL,
        subject: `🥐 Nouvelle commande — ${nom} — ${date_retrait} ${heure_retrait}`,
        html: `
          <h2>Nouvelle commande reçue</h2>
          <p><strong>Client :</strong> ${nom}</p>
          <p><strong>Téléphone :</strong> ${telephone}</p>
          ${email ? `<p><strong>Email :</strong> ${email}</p>` : ''}
          <p><strong>Retrait :</strong> ${date_retrait} à ${heure_retrait}</p>
          <h3>Produits :</h3>
          <ul>${produitsHtml}</ul>
          ${notes ? `<p><strong>Remarques :</strong> ${notes}</p>` : ''}
          ${carte_fidelite ? `<p><strong>Carte fidélité :</strong> ${carte_fidelite}</p>` : ''}
          <p><strong>Statut :</strong> ${paid ? '✅ Payé en ligne' : '⏳ Paiement à la caisse'}</p>
          <hr>
          <p><a href="${process.env.URL}/dashboard.html">Voir le dashboard →</a></p>
        `
      })
    });
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, order_id: order.id })
  };
};
