CREATE DATABASE IF NOT EXISTS snapfix_mobile_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE snapfix_mobile_care;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS repair_status_logs;
DROP TABLE IF EXISTS repair_requests;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash CHAR(128) NOT NULL,
  password_salt CHAR(32) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE services (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  short_description VARCHAR(255) NOT NULL,
  full_description TEXT NOT NULL,
  price_range VARCHAR(120) NOT NULL,
  turnaround_time VARCHAR(120) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'wrench',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE repair_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_number VARCHAR(40) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  contact_number VARCHAR(40) NOT NULL,
  device_brand VARCHAR(80) NOT NULL,
  device_model VARCHAR(120) NOT NULL,
  service_type VARCHAR(150) NOT NULL,
  issue_title VARCHAR(180) NOT NULL,
  issue_description TEXT NOT NULL,
  urgency VARCHAR(30) NOT NULL DEFAULT 'standard',
  preferred_date DATE NULL,
  budget VARCHAR(100) NULL,
  preferred_time VARCHAR(30) NULL,
  pickup_option VARCHAR(50) NOT NULL DEFAULT 'store_pickup',
  pickup_address TEXT NULL,
  city_municipality VARCHAR(120) NULL,
  landmark VARCHAR(180) NULL,
  status ENUM('received', 'diagnosing', 'awaiting_approval', 'repair_in_progress', 'quality_check', 'ready_for_pickup', 'completed') NOT NULL DEFAULT 'received',
  estimate_amount DECIMAL(10, 2) NULL,
  payment_status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
  image_paths LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_repairs_user_id (user_id),
  INDEX idx_repairs_status (status),
  CONSTRAINT fk_repairs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE repair_status_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  repair_request_id INT UNSIGNED NOT NULL,
  status ENUM('received', 'diagnosing', 'awaiting_approval', 'repair_in_progress', 'quality_check', 'ready_for_pickup', 'completed') NOT NULL,
  note TEXT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_logs_repair_request_id (repair_request_id),
  CONSTRAINT fk_logs_repair FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_logs_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contact_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (full_name, email, password_hash, password_salt, phone, role)
VALUES (
  'Kalikot Tech Admin',
  'johnmarkangelojebulan@gmail.com',
  'efb0e1b538635b85be1833345d69b37cab837f88f9a41421a27f34c4e1e0973c8dda0a18a071dc2a40e37ef085e8650df417a8a64f8f04cbe1f600bb65a4d4bb',
  '64ff49196fe54770747db83b97632219',
  '0945 376 3952',
  'admin'
);

INSERT INTO services (title, slug, short_description, full_description, price_range, turnaround_time, icon, featured, active)
VALUES
  (
    'Screen Replacement',
    'screen-replacement',
    'Fix cracked glass, black spots, flickering panels, and touch issues.',
    'Precision screen replacement service for cracked displays, OLED and LCD damage, dead pixels, ghost touch, and frame alignment issues.',
    'PHP 2,500 - PHP 8,500',
    '1 to 3 hours',
    'smartphone',
    1,
    1
  ),
  (
    'Battery Replacement',
    'battery-replacement',
    'Restore battery life and stop sudden shutdowns or overheating.',
    'Battery diagnostics and replacement for degraded battery health, overheating, random shutdowns, and swollen cells.',
    'PHP 1,500 - PHP 4,000',
    '45 to 90 minutes',
    'battery',
    1,
    1
  ),
  (
    'Charging Port Repair',
    'charging-port-repair',
    'Fix loose charging cables and intermittent or failed charging.',
    'Repair or replace charging ports damaged by bent pins, corrosion, dirt buildup, or broken flex connectors.',
    'PHP 1,200 - PHP 3,500',
    '1 to 2 hours',
    'zap',
    1,
    1
  ),
  (
    'Back Glass and Housing Repair',
    'back-glass-repair',
    'Refresh cracked rear panels, bent frames, and damaged housings.',
    'Back glass and housing restoration for cosmetic damage, bent side rails, cracked back covers, and button alignment issues.',
    'PHP 2,000 - PHP 6,500',
    '2 to 4 hours',
    'spark',
    0,
    1
  ),
  (
    'Camera and Lens Repair',
    'camera-repair',
    'Fix camera blur, broken lenses, and focus or stabilization issues.',
    'Front and rear camera repair service covering cracked camera glass, autofocus issues, black screen camera output, and lens replacement.',
    'PHP 1,800 - PHP 5,500',
    '1 to 3 hours',
    'camera',
    0,
    1
  ),
  (
    'Water Damage Treatment',
    'water-damage-treatment',
    'Emergency diagnostics and cleanup for liquid-exposed phones.',
    'Board-level diagnostics, internal cleaning, corrosion prevention, and device recovery planning for water-damaged mobile phones.',
    'PHP 1,500 - PHP 7,000',
    '24 to 72 hours',
    'droplet',
    0,
    1
  );
