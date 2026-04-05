-- ============================================================
-- CHEZ ALEXIS — Schéma Supabase
-- Coller ce SQL dans l'éditeur SQL de supabase.com
-- ============================================================

-- Table des commandes
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  nom           TEXT NOT NULL,
  telephone     TEXT NOT NULL,
  email         TEXT,
  date_retrait  DATE NOT NULL,
  heure_retrait TEXT NOT NULL,
  produits      JSONB NOT NULL,
  notes         TEXT,
  carte_fidelite TEXT,
  statut        TEXT DEFAULT 'pending' CHECK (statut IN ('pending','confirmed','ready','done','cancelled')),
  paid          BOOLEAN DEFAULT false
);

-- Table des cartes fidélité
CREATE TABLE loyalty_cards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  card_id    TEXT UNIQUE NOT NULL,
  nom        TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  telephone  TEXT,
  tampons    INT DEFAULT 0 CHECK (tampons >= 0 AND tampons <= 10)
);

-- Fonction pour incrémenter un tampon (appelée depuis create-order)
CREATE OR REPLACE FUNCTION increment_stamp(card_id TEXT)
RETURNS void AS $$
  UPDATE loyalty_cards
  SET tampons = LEAST(tampons + 1, 10),
      updated_at = now()
  WHERE loyalty_cards.card_id = card_id;
$$ LANGUAGE sql;

-- Index utiles
CREATE INDEX idx_orders_date ON orders(date_retrait);
CREATE INDEX idx_orders_statut ON orders(statut);
CREATE INDEX idx_loyalty_card_id ON loyalty_cards(card_id);
CREATE INDEX idx_loyalty_email ON loyalty_cards(email);

-- Sécurité : désactiver l'accès public (tout passe par service_role)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
