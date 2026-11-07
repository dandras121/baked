CREATE TABLE "job_runs" (
	"job" text NOT NULL,
	"day" date NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_runs_job_day_pk" PRIMARY KEY("job","day")
);
