-- CloudGate operational tables (minimal schema for CDC demo)

CREATE TABLE IF NOT EXISTS cg_access_event (
  event_id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  event_time DATETIME(3) NOT NULL,
  person_id VARCHAR(50),
  badge_id VARCHAR(50) NOT NULL,
  site_id VARCHAR(50) NOT NULL,
  location_id VARCHAR(50) NOT NULL,
  direction ENUM('IN', 'OUT') NOT NULL,
  result ENUM('grant', 'deny') NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  deny_reason VARCHAR(255),
  deny_code VARCHAR(50),
  pacs_source ENUM('LENEL', 'CCURE', 'S2', 'GENETEC') NOT NULL,
  pacs_event_id VARCHAR(100) NOT NULL,
  raw_payload TEXT,
  suspicious_flag TINYINT DEFAULT 0,
  suspicious_reason VARCHAR(255),
  suspicious_score FLOAT DEFAULT 0,
  processed_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_tenant_time (tenant_id, event_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cg_connector_health (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  connector_id VARCHAR(50) NOT NULL,
  connector_name VARCHAR(100) NOT NULL,
  pacs_type ENUM('LENEL', 'CCURE', 'S2', 'GENETEC') NOT NULL,
  pacs_version VARCHAR(50),
  check_time DATETIME(3) NOT NULL,
  status ENUM('healthy', 'degraded', 'offline') NOT NULL,
  latency_ms INT UNSIGNED NOT NULL,
  events_per_minute FLOAT NOT NULL,
  error_count_1h INT UNSIGNED DEFAULT 0,
  last_event_time DATETIME(3),
  error_message VARCHAR(500),
  error_code VARCHAR(50),
  endpoint_url VARCHAR(255),
  last_successful_sync DATETIME(3),
  INDEX idx_tenant_connector_time (tenant_id, connector_id, check_time)
) ENGINE=InnoDB;
