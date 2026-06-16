CREATE TABLE `chat_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`model` varchar(64) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threat_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('url_scan','apk_analysis','osint','hash_crack') NOT NULL,
	`target` text NOT NULL,
	`result` text,
	`riskLevel` enum('safe','low','medium','high','critical') DEFAULT 'safe',
	`sessionToken` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `threat_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vip_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `vip_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `vip_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
