# Local Data Schema

Use SQLite or another local persistence technology, chosen and documented by implementation. Schema is a conceptual MVP baseline; adapt migrations as needed.

## Tables

### projects
- id: TEXT primary key
- name: TEXT
- root_path: TEXT
- project_type: TEXT nullable
- created_at: TEXT ISO timestamp
- updated_at: TEXT ISO timestamp
- settings_json: TEXT nullable

### conversations
- id: TEXT primary key
- project_id: TEXT nullable FK projects
- title: TEXT
- created_at: TEXT
- updated_at: TEXT

### messages
- id: TEXT primary key
- conversation_id: TEXT FK conversations
- role: TEXT (user/assistant/tool/system; constrain valid roles)
- content: TEXT
- created_at: TEXT
- metadata_json: TEXT nullable

### tasks
- id: TEXT primary key
- project_id: TEXT nullable FK projects
- conversation_id: TEXT nullable FK conversations
- status: TEXT
- description: TEXT
- plan_json: TEXT nullable
- started_at: TEXT nullable
- finished_at: TEXT nullable
- verification_json: TEXT nullable

### tool_runs
- id: TEXT primary key
- task_id: TEXT FK tasks
- tool_name: TEXT
- status: TEXT
- input_summary: TEXT
- output_summary: TEXT nullable
- started_at: TEXT
- finished_at: TEXT nullable
- approval_required: INTEGER
- approved: INTEGER nullable

### checkpoints
- id: TEXT primary key
- project_id: TEXT FK projects
- description: TEXT
- checkpoint_location: TEXT
- created_at: TEXT
- metadata_json: TEXT nullable

### settings
- key: TEXT primary key
- value_json: TEXT
- updated_at: TEXT

## Privacy
All database data stays local by default. Avoid storing secrets, raw environment files, or unnecessary diagnostic payloads. Provide local deletion/export controls where practical. Use migrations and parameterized queries.
