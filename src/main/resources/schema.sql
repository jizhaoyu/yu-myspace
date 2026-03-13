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
    workspace_path TEXT,
    context_files_json TEXT NOT NULL DEFAULT '[]',
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
