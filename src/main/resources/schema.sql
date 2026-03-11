CREATE TABLE IF NOT EXISTS conversation_session (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    active_engine TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_task (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    engine TEXT NOT NULL,
    priority INTEGER NOT NULL,
    insert_mode INTEGER NOT NULL DEFAULT 0,
    dual_mode INTEGER NOT NULL DEFAULT 0,
    queue_sequence INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    error_message TEXT,
    estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    FOREIGN KEY(session_id) REFERENCES conversation_session(id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_task_session_status
    ON prompt_task(session_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS prompt_message (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    task_id TEXT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES conversation_session(id),
    FOREIGN KEY(task_id) REFERENCES prompt_task(id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_message_session_created
    ON prompt_message(session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS app_setting (
    setting_key TEXT PRIMARY KEY,
    json_value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS prompt_message_fts
USING fts5(
    message_id UNINDEXED,
    session_id UNINDEXED,
    task_id UNINDEXED,
    role,
    content
);

CREATE TRIGGER IF NOT EXISTS trg_prompt_message_ai
AFTER INSERT ON prompt_message
BEGIN
    INSERT INTO prompt_message_fts(message_id, session_id, task_id, role, content)
    VALUES (new.id, new.session_id, new.task_id, new.role, new.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_prompt_message_ad
AFTER DELETE ON prompt_message
BEGIN
    DELETE FROM prompt_message_fts WHERE message_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_prompt_message_au
AFTER UPDATE ON prompt_message
BEGIN
    DELETE FROM prompt_message_fts WHERE message_id = old.id;
    INSERT INTO prompt_message_fts(message_id, session_id, task_id, role, content)
    VALUES (new.id, new.session_id, new.task_id, new.role, new.content);
END;
