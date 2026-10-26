CREATE TABLE `entries` (
	`series_id` text NOT NULL,
	`event_id` text NOT NULL,
	`entry_no` integer NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`series_id`, `event_id`, `entry_no`),
	FOREIGN KEY (`series_id`,`event_id`) REFERENCES `events`(`series_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event_series` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`series_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`contact` text NOT NULL,
	PRIMARY KEY(`series_id`, `id`),
	FOREIGN KEY (`series_id`) REFERENCES `event_series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `performers` (
	`series_id` text NOT NULL,
	`event_id` text NOT NULL,
	`entry_no` integer NOT NULL,
	`video_no` integer NOT NULL,
	PRIMARY KEY(`series_id`, `event_id`, `entry_no`, `video_no`),
	FOREIGN KEY (`series_id`,`event_id`,`entry_no`) REFERENCES `entries`(`series_id`,`event_id`,`entry_no`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`,`event_id`,`video_no`) REFERENCES `videos`(`series_id`,`event_id`,`no`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`series_id` text NOT NULL,
	`event_id` text NOT NULL,
	`no` integer NOT NULL,
	`file_name` text NOT NULL,
	`storage_key` text NOT NULL,
	`duration_sec` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	PRIMARY KEY(`series_id`, `event_id`, `no`),
	FOREIGN KEY (`series_id`,`event_id`) REFERENCES `events`(`series_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `videos_storage_key_unique` ON `videos` (`storage_key`);