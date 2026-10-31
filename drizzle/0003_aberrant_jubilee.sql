CREATE TABLE "faq_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "faq_category" CHECK ("faq_questions"."category" in ('ordering', 'paying', 'food', 'delivery', 'after', 'kitchen')),
	CONSTRAINT "faq_question_length" CHECK (char_length("faq_questions"."question") between 1 and 140),
	CONSTRAINT "faq_answer_length" CHECK (char_length("faq_questions"."answer") between 1 and 2000)
);
