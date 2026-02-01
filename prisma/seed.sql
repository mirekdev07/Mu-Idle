-- Seed script for MU Idle Adventure
-- Run this in Neon SQL Console

-- Clear existing items
DELETE FROM items;

-- Insert items
INSERT INTO items (type, slot, name, level, damage_min, damage_max, attack_speed, defense, category, emoji, created_at) VALUES
-- Category 0 - Swords/Weapons
(0, 0, 'Kris', 6, 6, 11, 50, 0, 0, '⚔️', NOW()),
(1, 0, 'Short Sword', 3, 3, 7, 20, 0, 0, '⚔️', NOW()),
(2, 0, 'Rapier', 9, 9, 15, 40, 0, 0, '⚔️', NOW()),
(3, 0, 'Katana', 16, 16, 26, 35, 0, 0, '⚔️', NOW()),
(4, 0, 'Sword of Assassin', 12, 12, 18, 30, 0, 0, '⚔️', NOW()),
(5, 0, 'Blade', 36, 36, 47, 30, 0, 0, '⚔️', NOW()),

-- Category 1 - Axes
(0, 0, 'Small Axe', 1, 1, 6, 20, 0, 1, '⚔️', NOW()),
(1, 0, 'Hand Axe', 4, 4, 9, 30, 0, 1, '⚔️', NOW()),
(2, 0, 'Double Axe', 14, 14, 24, 20, 0, 1, '⚔️', NOW()),
(3, 0, 'Tomahawk', 18, 18, 28, 30, 0, 1, '⚔️', NOW()),

-- Category 6 - Shields
(0, 1, 'Small Shield', 3, 0, 0, 0, 1, 6, '🛡️', NOW()),
(1, 1, 'Horn Shield', 9, 0, 0, 0, 3, 6, '🛡️', NOW()),
(2, 1, 'Kite Shield', 12, 0, 0, 0, 4, 6, '🛡️', NOW()),
(3, 1, 'Elven Shield', 21, 0, 0, 0, 8, 6, '🛡️', NOW()),

-- Category 7 - Helms
(0, 2, 'Bronze Helm', 16, 0, 0, 0, 9, 7, '⛑️', NOW()),
(1, 2, 'Dragon Helm', 57, 0, 0, 0, 24, 7, '⛑️', NOW()),
(2, 2, 'Pad Helm', 5, 0, 0, 0, 4, 7, '⛑️', NOW()),
(3, 2, 'Legendary Helm', 50, 0, 0, 0, 18, 7, '⛑️', NOW()),

-- Category 8 - Armor
(0, 3, 'Bronze Armor', 18, 0, 0, 0, 14, 8, '🦺', NOW()),
(1, 3, 'Dragon Armor', 59, 0, 0, 0, 37, 8, '🦺', NOW()),
(2, 3, 'Pad Armor', 10, 0, 0, 0, 7, 8, '🦺', NOW()),
(3, 3, 'Legendary Armor', 56, 0, 0, 0, 22, 8, '🦺', NOW()),

-- Category 9 - Pants
(0, 4, 'Bronze Pants', 15, 0, 0, 0, 10, 9, '👖', NOW()),
(1, 4, 'Dragon Pants', 55, 0, 0, 0, 26, 9, '👖', NOW()),
(2, 4, 'Pad Pants', 8, 0, 0, 0, 5, 9, '👖', NOW()),

-- Category 10 - Gloves
(0, 5, 'Bronze Gloves', 13, 0, 0, 4, 4, 10, '🧤', NOW()),
(1, 5, 'Dragon Gloves', 52, 0, 0, 6, 14, 10, '🧤', NOW()),
(2, 5, 'Pad Gloves', 3, 0, 0, 0, 2, 10, '🧤', NOW()),

-- Category 11 - Boots
(0, 6, 'Bronze Boots', 12, 0, 0, 0, 4, 11, '🥾', NOW()),
(1, 6, 'Dragon Boots', 54, 0, 0, 0, 15, 11, '🥾', NOW()),
(2, 6, 'Pad Boots', 4, 0, 0, 0, 3, 11, '🥾', NOW());

-- Verify
SELECT COUNT(*) as item_count FROM items;
