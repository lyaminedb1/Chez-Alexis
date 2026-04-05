// ============================================================
// POST /api/stripe-payment
// Crée un PaymentIntent Stripe pour une commande
// Le frontend confirme ensuite le paiement avec Stripe.js
// ============================================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Prix unitaires en centimes (€)
const PRIX = {
  'Baguette tradition':   130,
  'Pain cacao-pralinée':  480,
  'Croissant':            160,
  'Chausson aux pommes':  160,
  'Yogo':                 380,
  'Flan lait-œuf':        300,
  'Pain au levain':       420,
};

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

  const { produits, nom, email } = body;
  // produits = [{ nom: 'Croissant', quantite: 2 }, ...]

  if (!produits?.length) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Aucun produit' }) };
  }

  // Calculer le montant total
  const montant = produits.reduce((total, p) => {
    const prix = PRIX[p.nom] || 0;
    return total + prix * p.quantite;
  }, 0);

  if (montant === 0) {
    return { statusCode: 422, body: JSON.stringify({ error: 'Montant invalide' }) };
  }

  // Créer le PaymentIntent Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: montant,
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    metadata: {
      client_nom: nom || '',
      client_email: email || '',
      produits: JSON.stringify(produits)
    },
    description: `Commande Chez Alexis — ${nom || 'Client'}`
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      montant_total: montant,
      montant_affiche: (montant / 100).toFixed(2) + ' €'
    })
  };
};
