-- ============================================================
-- SavePlate Database Schema
-- MySQL 8.x | utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS saveplate_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE saveplate_db;

-- ─── 1. users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id        INT            NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(150)   NOT NULL,
  email          VARCHAR(255)   NOT NULL,
  password_hash  VARCHAR(255)   NOT NULL,
  household_size INT            NULL,
  is_2fa_enabled TINYINT(1)     NOT NULL DEFAULT 0,
  food_visibility ENUM('public','private') NOT NULL DEFAULT 'private',
  is_verified    TINYINT(1)     NOT NULL DEFAULT 0,
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ─── 2. verification_codes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_codes (
  code_id    INT       NOT NULL AUTO_INCREMENT,
  user_id    INT       NOT NULL,
  code       CHAR(6)   NOT NULL,
  expires_at DATETIME  NOT NULL,
  is_used    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code_id),
  CONSTRAINT fk_vc_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── 3. food_items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_items (
  food_id          INT             NOT NULL AUTO_INCREMENT,
  user_id          INT             NOT NULL,
  item_name        VARCHAR(200)    NOT NULL,
  quantity         DECIMAL(10,2)   NOT NULL,
  unit             VARCHAR(50)     NOT NULL,
  expiry_date      DATE            NOT NULL,
  category         VARCHAR(100)    NOT NULL,
  storage_location VARCHAR(100)    NULL,
  remarks          TEXT            NULL,
  status           ENUM('active','used','donated','reserved') NOT NULL DEFAULT 'active',
  reserved_qty     DECIMAL(10,2)   NOT NULL DEFAULT 0,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (food_id),
  CONSTRAINT fk_fi_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  INDEX idx_fi_user_status (user_id, status),
  INDEX idx_fi_expiry (expiry_date)
) ENGINE=InnoDB;

-- ─── 4. donations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  donation_id     INT           NOT NULL AUTO_INCREMENT,
  food_id         INT           NOT NULL,
  donor_id        INT           NOT NULL,
  recipient_id    INT           NULL,
  pickup_location VARCHAR(300)  NOT NULL,
  availability    VARCHAR(200)  NULL,
  status          ENUM('available','claimed','completed','cancelled') NOT NULL DEFAULT 'available',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (donation_id),
  CONSTRAINT fk_don_food      FOREIGN KEY (food_id)      REFERENCES food_items (food_id) ON DELETE CASCADE,
  CONSTRAINT fk_don_donor     FOREIGN KEY (donor_id)     REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_don_recipient FOREIGN KEY (recipient_id) REFERENCES users (user_id) ON DELETE SET NULL,
  INDEX idx_don_status (status),
  INDEX idx_don_donor (donor_id)
) ENGINE=InnoDB;

-- ─── 5. notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT           NOT NULL AUTO_INCREMENT,
  user_id         INT           NOT NULL,
  type            ENUM('expiry','donation_update','meal_reminder','account_security') NOT NULL,
  message         VARCHAR(500)  NOT NULL,
  related_id      INT           NULL,
  is_read         TINYINT(1)    NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- ─── 6. meal_plans ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plans (
  meal_plan_id  INT  NOT NULL AUTO_INCREMENT,
  user_id       INT  NOT NULL,
  week_start    DATE NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meal_plan_id),
  CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  UNIQUE KEY uq_mp_user_week (user_id, week_start)
) ENGINE=InnoDB;

-- ─── 7. meal_slots ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_slots (
  slot_id      INT          NOT NULL AUTO_INCREMENT,
  meal_plan_id INT          NOT NULL,
  day_index    TINYINT      NOT NULL COMMENT '0=Mon, 1=Tue, ..., 6=Sun',
  meal_type    ENUM('breakfast','lunch','dinner','snack') NOT NULL,
  meal_name    VARCHAR(200) NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slot_id),
  CONSTRAINT fk_ms_plan FOREIGN KEY (meal_plan_id) REFERENCES meal_plans (meal_plan_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── 8. meal_slot_ingredients ────────────────────────────────
-- Links a meal slot to inventory items (reserved ingredients)
CREATE TABLE IF NOT EXISTS meal_slot_ingredients (
  id       INT NOT NULL AUTO_INCREMENT,
  slot_id  INT NOT NULL,
  food_id  INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_msi_slot FOREIGN KEY (slot_id) REFERENCES meal_slots (slot_id) ON DELETE CASCADE,
  CONSTRAINT fk_msi_food FOREIGN KEY (food_id) REFERENCES food_items (food_id) ON DELETE CASCADE
) ENGINE=InnoDB;
