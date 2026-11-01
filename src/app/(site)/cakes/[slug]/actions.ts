"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readCakePage } from "@/db/cake-page-repo";
import { connect, databaseUrl } from "@/db/client";
import {
  addLine,
  draftIsFull,
  draftStatus,
  DRAFT_COOKIE,
  DRAFT_COOKIE_DAYS,
  draftLineViews,
  readLine,
  updateLine,
  type LineView,
} from "@/db/draft-repo";
import type { Answers } from "@/lib/cake-config";
import {
  cleanAnswers,
  returnStep,
  inscriptionError,
  LINE_COPY,
  normaliseText,
  optionErrors,
} from "@/lib/order-line";

export type AddValues = {
  size: number | null;
  answers: Answers;
  inscription: string;
};

export type AddState = {
  /** idle · invalid (errors under the fields) · plain (ask “Leave the cake plain?”) · added (A) · cap (C) · failed */
  kind: "idle" | "invalid" | "plain" | "added" | "cap" | "failed";
  /** Keyed by "option-{id}" and "inscription". */
  errors: Record<string, string>;
  notice: string | null;
  lines: LineView[];
  values: AddValues;
  /** The cookie's draft had been cleared after a day without changes, so this cake started a new order (§10.2). */
  cleared?: boolean;
};

export type LoadedLine = {
  size: number;
  answers: Answers;
  inscription: string;
};

/** Edit mode (§5.1): the line's size, answers and inscription, when it is a line of this visitor's draft for this cake. */
export async function loadLine(
  slug: string,
  lineId: number,
): Promise<LoadedLine | null> {
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const id = (await cookies()).get(DRAFT_COOKIE)?.value;
    const line = await readLine(db, id, lineId);
    if (!line || line.slug !== slug) return null;
    return {
      size: line.sizeId,
      answers: line.answers,
      inscription: line.inscription,
    };
  } finally {
    await close();
  }
}

/** The form's answers: size, option-{id} (radio, boxes, text) and the inscription. */
function readForm(form: FormData): AddValues {
  const answers: Answers = { picks: {}, texts: {} };
  for (const [key, value] of form.entries()) {
    const m = /^option-(\d+)$/.exec(key);
    if (!m || typeof value !== "string") continue;
    const id = Number(m[1]);
    if (/^\d+$/.test(value) && form.get(`kind-${id}`) !== "text")
      (answers.picks[id] ??= []).push(Number(value));
    else answers.texts[id] = value;
  }
  const size = Number(form.get("size"));
  return {
    size: Number.isInteger(size) && size > 0 ? size : null,
    answers,
    inscription: String(form.get("inscription") ?? ""),
  };
}

/**
 * Add to your order (§5.1): the 5-cake cap first, then every option and the inscription, then — with an empty
 * inscription — “Leave the cake plain?” (the sheet with JavaScript; without it the same question comes back from
 * here). Then the line goes into the draft and the block becomes “Added to your order”.
 */
export async function addToOrder(
  _: AddState,
  form: FormData,
): Promise<AddState> {
  const values = readForm(form);
  const base: AddState = {
    kind: "idle",
    errors: {},
    notice: null,
    lines: [],
    values,
  };
  if (!databaseUrl())
    return { ...base, kind: "failed", notice: LINE_COPY.gone };
  const { db, close } = connect();
  try {
    const cake = await readCakePage(db, String(form.get("slug") ?? ""));
    const size = cake?.sizes.find((s) => s.id === values.size) ?? null;
    if (!cake || !size)
      return { ...base, kind: "failed", notice: LINE_COPY.gone };

    const jar = await cookies();
    const draftId = jar.get(DRAFT_COOKIE)?.value;
    const inscription = cake.offerInscription
      ? normaliseText(values.inscription)
      : "";

    const errors: Record<string, string> = {};
    for (const [id, message] of Object.entries(
      optionErrors(cake.options, values.answers),
    ))
      errors[`option-${id}`] = message;
    const problem = cake.offerInscription
      ? inscriptionError(values.inscription)
      : null;
    if (problem) errors.inscription = problem;

    const lineId = Number(form.get("line"));
    const editing = Number.isInteger(lineId) && lineId > 0;
    // The cap first (§5.1): with five cakes already in, nothing else is asked. (Editing a line adds nothing.)
    if (!editing && (await draftIsFull(db, draftId)))
      return { ...base, kind: "cap" };
    if (Object.keys(errors).length) return { ...base, kind: "invalid", errors };
    if (
      cake.offerInscription &&
      !inscription &&
      !form.getAll("plain").includes("1")
    )
      return { ...base, kind: "plain" };

    const answers = cleanAnswers(cake.options, values.answers);
    if (editing) {
      const saved = await updateLine(db, draftId, lineId, {
        sizeId: size.id,
        answers,
        inscription,
      });
      if (!saved)
        return { ...base, kind: "failed", notice: LINE_COPY.lineGone };
      redirect(returnStep(form.get("from")));
    }

    const cleared = (await draftStatus(db, draftId)) === "cleared";
    const result = await addLine(db, draftId, {
      cakeId: cake.id,
      sizeId: size.id,
      answers,
      inscription,
    });
    jar.set(DRAFT_COOKIE, result.draftId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DRAFT_COOKIE_DAYS * 24 * 60 * 60,
    });
    if (result.kind === "cap") return { ...base, kind: "cap" };
    return {
      ...base,
      kind: "added",
      cleared,
      lines: await draftLineViews(db, result.draftId),
    };
  } finally {
    await close();
  }
}
