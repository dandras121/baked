"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { unstable_rethrow } from "next/navigation";
import {
  addToOrder,
  loadLine,
  type AddState,
} from "@/app/(site)/cakes/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Overlay } from "@/components/ui/overlay";
import { Checkbox } from "@/components/ui/choice";
import { FieldError } from "@/components/ui/field-error";
import { Link } from "@/components/ui/link";
import { TextField } from "@/components/ui/text-field";
import {
  addOnLabel,
  allergenLine,
  includesLine,
  linePricePence,
  NO_ANSWERS,
  priceDetail,
  sizeChoices,
  tierWords,
  togglePick,
  type Answers,
  type OptionView,
} from "@/lib/cake-config";
import type { CakePageData } from "@/lib/cake-page";
import type { Allergen } from "@/lib/constants";
import { formatPrice } from "@/lib/money";
import { inscriptionError, LINE_COPY, optionErrors } from "@/lib/order-line";
import { AddedPanel, CapPanel, InscriptionBlock } from "./cake-order";
import { CakeMedia } from "./cake-media";
import styles from "./cake-page.module.css";
import { PriceFigure } from "./price-figure";

const ERROR_ORDER = (cake: CakePageData) => [
  ...cake.options.map((o) => `option-${o.id}`),
  "inscription",
];

/**
 * The cake page, step 1 — The cake (§5.1; desktop 609:2889, phone 815:5841; with options 1715:11996). The size
 * (the smallest pre-selected), Linda's options (§5.8), the inscription and its preview, the live price (ANIM-20),
 * the allergen line (it follows the options) and Add to your order: the cap first, then every option and the
 * inscription, then “Leave the cake plain?”, then “Added to your order” (or the cap notice). Without JavaScript the
 * same form posts to the server, which asks the same questions. The stepper is slice 4.1.
 */
export function CakePage({
  cake,
  kitchen,
}: {
  cake: CakePageData;
  kitchen: readonly Allergen[];
}) {
  const sizes = sizeChoices(cake.sizes);
  const INITIAL: AddState = {
    kind: "idle",
    errors: {},
    notice: null,
    lines: [],
    values: {
      size: sizes[0]?.id ?? null,
      answers: NO_ANSWERS,
      inscription: "",
    },
  };
  // Without JavaScript the form posts here; with it, the wrapper turns a lost connection into a notice.
  const [posted, postAction] = useActionState(addToOrder, INITIAL);
  const [state, formAction, pending] = useActionState<AddState, FormData>(
    async (previous, form) => {
      try {
        return await addToOrder(previous, form);
      } catch (error) {
        unstable_rethrow(error); // Save this cake goes back to the step it came from
        return {
          ...previous,
          kind: "failed",
          errors: {},
          notice: LINE_COPY.failed,
        };
      }
    },
    posted,
  );
  const [sizeId, setSizeId] = useState(posted.values.size ?? sizes[0]?.id);
  const [answers, setAnswers] = useState<Answers>(posted.values.answers);
  const [inscription, setInscription] = useState(posted.values.inscription);
  const [errors, setErrors] = useState<Record<string, string>>(posted.errors);
  const [askPlain, setAskPlain] = useState(false);
  const [seen, setSeen] = useState(state);
  const [focusFirst, setFocusFirst] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const plainRef = useRef<HTMLInputElement>(null);
  // Where the focus goes when the sheet closes: the field (Add a message, Esc) or the added panel (Yes).
  const afterSheet = useRef<"field" | "added">("field");
  // Edit mode (§5.1): /cakes/{slug}?line={id}&from={step} loads that line; the button saves it in place.
  const [editing, setEditing] = useState<{ line: number; from: string } | null>(
    null,
  );
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const line = Number(q.get("line"));
    if (!Number.isInteger(line) || line <= 0) return;
    let live = true;
    void loadLine(cake.slug, line).then((found) => {
      if (!live || !found) return;
      setSizeId(found.size);
      setAnswers(found.answers);
      setInscription(found.inscription);
      setEditing({ line, from: q.get("from") ?? "" });
    });
    return () => {
      live = false;
    };
  }, [cake.slug]);
  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const price = size ? linePricePence(size, cake.options, answers) : 0;
  const includes = includesLine(cake.options, answers);

  // A server answer: errors come back under their fields; “plain” opens the sheet.
  if (state !== seen) {
    setSeen(state);
    if (state.kind === "invalid") {
      setErrors(state.errors);
      setFocusFirst((n) => n + 1);
    }
    if (state.kind === "plain") setAskPlain(true);
  }

  useEffect(() => {
    if (!focusFirst) return;
    const first = ERROR_ORDER(cake).find((f) => errors[f]);
    formRef.current
      ?.querySelector<HTMLElement>(
        `[data-field="${first}"] input:not([type=hidden]), [data-field="${first}"] textarea`,
      )
      ?.focus();
    // Only when a failed Add asks for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusFirst]);

  /** A field with an error is checked again as it is corrected. */
  const recheck = (nextAnswers: Answers, nextInscription: string) => {
    if (!Object.keys(errors).length) return;
    const now: Record<string, string> = {};
    for (const [id, m] of Object.entries(
      optionErrors(cake.options, nextAnswers),
    ))
      if (errors[`option-${id}`]) now[`option-${id}`] = m;
    const ins = cake.offerInscription
      ? inscriptionError(nextInscription)
      : null;
    if (ins && errors.inscription) now.inscription = ins;
    setErrors(now);
  };

  const submit = (plain: boolean) => {
    const form = formRef.current;
    if (!form || pending) return;
    if (plainRef.current) plainRef.current.value = plain ? "1" : "";
    const data = new FormData(form);
    startTransition(() => formAction(data));
  };

  const done = state.kind === "added" || state.kind === "cap";

  return (
    <div className={styles.page}>
      <CakeMedia items={cake.media} name={cake.name} />
      <div className={styles.content}>
        <Link href="/cakes" className={styles.back}>
          ← Back to the range
        </Link>
        <h1 className={styles.name}>{cake.name}</h1>
        <p className={styles.whatItIs}>{cake.whatItIs}</p>
        {cake.from && <p className={styles.from}>{cake.from}</p>}

        {state.kind === "added" && (
          <AddedPanel lines={state.lines} cleared={state.cleared} />
        )}
        {state.kind === "cap" && <CapPanel />}

        <form
          ref={formRef}
          action={postAction}
          noValidate
          hidden={done}
          onSubmit={(e) => {
            e.preventDefault();
            const found: Record<string, string> = {};
            for (const [id, m] of Object.entries(
              optionErrors(cake.options, answers),
            ))
              found[`option-${id}`] = m;
            const ins = cake.offerInscription
              ? inscriptionError(inscription)
              : null;
            if (ins) found.inscription = ins;
            setErrors(found);
            // The cap is the server's to check first; with errors here it still asks, so the cap notice wins.
            if (Object.keys(found).length) setFocusFirst((n) => n + 1);
            submit(false);
          }}
        >
          <input type="hidden" name="slug" value={cake.slug} />
          {editing && (
            <>
              <input type="hidden" name="line" value={editing.line} />
              <input type="hidden" name="from" value={editing.from} />
            </>
          )}
          <input ref={plainRef} type="hidden" name="plain" defaultValue="" />
          {size && (
            <fieldset className={styles.section}>
              <legend className={styles.sectionLabel}>Size</legend>
              {sizes.length === 1 ? (
                <>
                  <input type="hidden" name="size" value={size.id} />
                  <p className={styles.oneSize}>
                    Serves {size.serves} · {tierWords(size.tiers)}
                  </p>
                </>
              ) : (
                <div className={styles.pills} data-kind="size">
                  {sizes.map((s) => (
                    <Pill
                      key={s.id}
                      name="size"
                      value={s.id}
                      checked={s.id === size.id}
                      title={s.name}
                      extra={s.extra}
                      detail={tierWords(s.tiers)}
                      onChange={() => setSizeId(s.id)}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {cake.options.map((o) => (
            <OptionBlock
              key={o.id}
              option={o}
              answers={answers}
              error={errors[`option-${o.id}`]}
              onChange={(a) => {
                setAnswers(a);
                recheck(a, inscription);
              }}
            />
          ))}

          {cake.offerInscription && (
            <InscriptionBlock
              value={inscription}
              error={errors.inscription}
              onChange={(t) => {
                setInscription(t);
                recheck(answers, t);
              }}
            />
          )}

          <div className={styles.price}>
            <PriceFigure text={formatPrice(price)} className={styles.amount} />
            {size && (
              <p className={styles.detail}>
                {priceDetail(size, {
                  offered: cake.offerInscription,
                  text: inscription,
                })}
              </p>
            )}
          </div>
          {includes && <p className={styles.includes}>{includes}</p>}

          {/* Without JavaScript the plain question comes back from the server as part of the page (only a
              JavaScript-free post fills `posted`; with JavaScript the sheet asks instead). */}
          {posted.kind === "plain" && (
            <Notice title={LINE_COPY.plainTitle}>
              {LINE_COPY.plainText}{" "}
              <button
                type="submit"
                name="plain"
                value="1"
                className={styles.noJsButton}
              >
                Yes, keep it plain
              </button>
            </Notice>
          )}

          <Button
            type="submit"
            block
            className={styles.add}
            busy={pending}
            busyLabel={editing ? "Saving" : "Adding"}
          >
            {editing ? "Save this cake" : "Add to your order"}
          </Button>
          {state.kind === "failed" && state.notice && (
            <div className={styles.addNotice}>
              <Notice
                tone="error"
                urgent
                title={editing ? "Nothing was saved" : "Nothing was added"}
              >
                {state.notice}
              </Notice>
            </div>
          )}
          {!editing && (
            <p className={styles.addNote}>
              Nothing is charged yet — add another cake if you need one, then
              pick a date for the whole order.
            </p>
          )}
        </form>
      </div>

      <section className={styles.allergens} aria-labelledby="allergens-heading">
        <h2 id="allergens-heading" className={styles.sectionLabel}>
          Allergens
        </h2>
        <p className={styles.allergenLine} aria-live="polite">
          {allergenLine(cake.allergens, cake.options, answers, kitchen)}
        </p>
        <Link href="/allergens" className={styles.allergenLink}>
          See full allergen information →
        </Link>
      </section>

      <Overlay
        open={askPlain}
        title={LINE_COPY.plainTitle}
        description={LINE_COPY.plainText}
        onClose={() => {
          // Esc = Add a message: back to the field.
          afterSheet.current = "field";
          setAskPlain(false);
        }}
        returnFocus={() =>
          afterSheet.current === "added"
            ? document.getElementById("added-heading")
            : (formRef.current?.querySelector<HTMLInputElement>(
                '[name="inscription"]',
              ) ?? null)
        }
      >
        <Button
          size="compact"
          onClick={() => {
            afterSheet.current = "added";
            setAskPlain(false);
            submit(true);
          }}
        >
          Yes, keep it plain
        </Button>
        <Button
          size="compact"
          variant="outline"
          onClick={() => {
            afterSheet.current = "field";
            setAskPlain(false);
          }}
        >
          Add a message
        </Button>
      </Overlay>
    </div>
  );
}

/** A size or Choice pill (V2 · Size option 606:2889 / 606:2892): a radio card, ANIM-07. */
function Pill({
  name,
  value,
  checked,
  title,
  extra,
  detail,
  onChange,
  onClick,
}: {
  name: string;
  value: number;
  checked: boolean;
  title: string;
  extra: string;
  detail?: string;
  onChange: () => void;
  onClick?: () => void;
}) {
  return (
    <label
      className={styles.pill}
      data-pressable
      data-checked={checked || undefined}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        className="visually-hidden"
      />
      <span className={styles.pillName}>{title}</span>
      {extra !== "included" && (
        <span className={styles.pillExtra}>{extra}</span>
      )}
      {detail && <span className="visually-hidden">, {detail}</span>}
    </label>
  );
}

/** One of Linda's options (§5.8): Choice pills, Choices boxes, a Text field or one Yes/no box. */
function OptionBlock({
  option: o,
  answers,
  onChange,
  error,
}: {
  option: OptionView;
  answers: Answers;
  onChange: (a: Answers) => void;
  error?: string;
}) {
  const errorId = `option-${o.id}-error`;
  const label = o.label;
  const picks = answers.picks[o.id] ?? [];
  const pick = (choiceId: number) => onChange(togglePick(o, answers, choiceId));

  if (o.type === "text")
    return (
      <div className={styles.section} data-field={`option-${o.id}`}>
        <input type="hidden" name={`kind-${o.id}`} value="text" />
        <TextField
          label={label}
          labelStyle="heading"
          error={error}
          name={`option-${o.id}`}
          max={o.maxLength}
          counterMode="always"
          value={answers.texts[o.id] ?? ""}
          onChange={(e) =>
            onChange({
              ...answers,
              texts: { ...answers.texts, [o.id]: e.target.value },
            })
          }
        />
      </div>
    );

  return (
    <fieldset
      className={styles.section}
      data-field={`option-${o.id}`}
      data-error={error ? "" : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className={styles.sectionLabel}>{label}</legend>
      {o.help && o.type !== "yesno" && <p className={styles.help}>{o.help}</p>}
      {o.type === "choice" && (
        <div className={styles.pills} data-kind="choice">
          {o.choices.map((c) => (
            <Pill
              key={c.id}
              name={`option-${o.id}`}
              value={c.id}
              checked={picks.includes(c.id)}
              title={c.label}
              extra={addOnLabel(c.pricePence)}
              onChange={() => pick(c.id)}
              // An optional Choice is cleared by tapping the selected pill again (§5.8).
              onClick={() => {
                if (!o.required && picks.includes(c.id)) pick(c.id);
              }}
            />
          ))}
        </div>
      )}
      {(o.type === "choices" || o.type === "yesno") && (
        <div className={styles.boxes}>
          {o.choices.map((c) => (
            <Checkbox
              key={c.id}
              name={`option-${o.id}`}
              value={c.id}
              checked={picks.includes(c.id)}
              onChange={() => pick(c.id)}
              label={
                <>
                  {o.type === "yesno" ? o.help || o.label : c.label}
                  {c.pricePence > 0 && (
                    <span className={styles.boxPrice}>
                      {" "}
                      +{formatPrice(c.pricePence)}
                    </span>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
