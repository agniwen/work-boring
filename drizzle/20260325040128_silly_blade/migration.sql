CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`parts_json` text NOT NULL,
	`status` text DEFAULT 'done' NOT NULL,
	`sequence` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`error_text` text,
	`metadata` text,
	CONSTRAINT `fk_chat_messages_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_message_at` integer,
	`model` text,
	`system_prompt` text,
	`summary` text,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_messages_session_sequence_uidx` ON `chat_messages` (`session_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `chat_messages_session_created_at_idx` ON `chat_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_updated_at_idx` ON `chat_sessions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_last_message_at_idx` ON `chat_sessions` (`last_message_at`);