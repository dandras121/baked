"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  removeCakeAction,
  saveCakeAction,
} from "@/app/admin/(shell)/cakes/actions";
import form from "@/components/admin/add-order/add-order.module.css";
import { LeaveGuard } from "@/components/admin/leave-guard";
import { SignInAgain } from "@/components/admin/order/sign-in-again";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import { TIERS } from "@/lib/admin/add-order";
import {
  allergenSummary,
  PICKER,
  smallestNote,
  type CakeErrors,
  type CakeForm as Form,
  type SizeRow,
} from "@/lib/admin/cake-form";
import { OCCASIONS, type Occasion } from "@/lib/constants";
import styles from "./cake-form.module.css";

/** The categories in the drawn order (940:8507). */
const CATEGORIES: Occasion[] = ["birthdays", "weddings", "kids", "corporate"];
const label = (k: Occasion) => OCCASIONS.find((o) => o.key === k)!.label;

/**
 * Add or edit a cake (§9.13; desktop 940:8507, phone 950:8886), Owner only: THE DETAILS — Name, What it is, Flavour,
 * SIZES (serves · tiers · price; + Add a size; Remove), Allergens (the picker 1801:13494), CATEGORIES, VISIBILITY;
 * Save; Delete this design (edit only). The photos and videos come with 9.2; the Options card with 9.1c.
 */
export function CakeFormScreen({
  id,
  initial,
}: {
  id: number | null;
  initial: Form;
}) {
  const router = useRouter();
  const [f, setF] = useState<Form>(initial);
  const [errors, setErrors] = useState<CakeErrors>({});
  const [line, setLine] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [picker, setPicker] = useState(false);
  const [remove, setRemove] = useState(false);
  const [busy, start] = useTransition();
  const dirty = !saved && JSON.stringify(f) !== JSON.stringify(initial);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const setRow = (i: number, patch: Partial<SizeRow>) => {
    setF((x) => ({
      ...x,
      sizes: x.sizes.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));
    setErrors((e) => ({ ...e, rows: e.rows && { ...e.rows, [i]: {} } }));
  };

  const save = () =>
    start(async () => {
      setLine(null);
      const r = await saveCakeAction(id, f).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "saved") {
        setSaved(true);
        router.push("/admin/cakes?saved=1");
        router.refresh();
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "invalid") {
        setErrors(r.errors);
        setLine("Nothing was saved — check the fields marked below.");
        return;
      }
      if (r.kind === "gone")
        return setLine("This cake was deleted meanwhile — nothing was saved.");
      setLine("Nothing was saved — please try again.");
    });

  const field = (
    k: "name" | "flavour",
    text: string,
    input: ReactNode,
    hint?: ReactNode,
  ) => (
    <div className={form.field}>
      <label htmlFor={`c-${k}`} className={form.label}>
        {text}
      </label>
      {input}
      {hint}
      <FieldError id={`c-${k}-error`} message={errors[k] ?? null} />
    </div>
  );
  const ticked = f.allergens.length;
  const saveButton = (
    <Button className={form.save} busy={busy} busyLabel="Saving" onClick={save}>
      {signIn === "back" ? "Save again" : "Save"}
    </Button>
  );

  return (
    <form
      className={form.page}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <LeaveGuard dirty={dirty} />
      <Link href="/admin/cakes" className={styles.back}>
        ‹ Back to cakes
      </Link>
      <div className={form.head}>
        <h1 className={form.title}>
          {id === null ? "Add a cake" : initial.name}
        </h1>
        {saveButton}
      </div>
      {id === null && (
        <p className={form.intro}>
          It goes on the site as soon as you save, unless you hide it.
        </p>
      )}
      {line && (
        <p className={form.alert} role="alert">
          {line}
        </p>
      )}
      {signIn === "back" && (
        <p className={form.hint}>Signed in again — press Save again.</p>
      )}

      <div className={styles.columns}>
        <section
          className={`${form.card} ${styles.photos}`}
          aria-labelledby="photos-h"
        >
          <h2 id="photos-h" className={form.section}>
            The photos
          </h2>
          {/* The main photo slot (4 : 5); photos and videos are added in 9.2. */}
          <span className={styles.photoSlot} aria-hidden />
        </section>

        <section className={form.card} aria-labelledby="details-h">
          <h2 id="details-h" className={form.section}>
            The details
          </h2>
          {field(
            "name",
            "Name",
            <input
              id="c-name"
              className={form.input}
              value={f.name}
              maxLength={60}
              aria-invalid={!!errors.name || undefined}
              aria-describedby={errors.name ? "c-name-error" : undefined}
              onChange={(e) => set("name", e.target.value)}
            />,
          )}
          <div className={form.field}>
            <label htmlFor="c-whatItIs" className={form.label}>
              What it is
            </label>
            <textarea
              id="c-whatItIs"
              className={`${form.input} ${form.area}`}
              value={f.whatItIs}
              maxLength={300}
              aria-invalid={!!errors.whatItIs || undefined}
              aria-describedby={
                errors.whatItIs ? "c-whatItIs-error" : undefined
              }
              onChange={(e) => set("whatItIs", e.target.value)}
            />
            <FieldError
              id="c-whatItIs-error"
              message={errors.whatItIs ?? null}
            />
          </div>
          {field(
            "flavour",
            "Flavour",
            <input
              id="c-flavour"
              className={form.input}
              value={f.flavour}
              maxLength={60}
              aria-invalid={!!errors.flavour || undefined}
              aria-describedby={`c-flavour-hint${errors.flavour ? " c-flavour-error" : ""}`}
              onChange={(e) => set("flavour", e.target.value)}
            />,
            <p id="c-flavour-hint" className={`${form.hint} ${styles.hintRow}`}>
              <span>
                Shown on the card and the order, e.g. Vanilla sponge, raspberry
              </span>
              <span>max 60</span>
            </p>,
          )}

          <h3 className={form.section}>Sizes</h3>
          <div className={styles.sizes} role="group" aria-label="Sizes">
            <span className={styles.sizeHead} aria-hidden>
              Serves
            </span>
            <span className={styles.sizeHead} aria-hidden>
              Tiers
            </span>
            <span className={styles.sizeHead} aria-hidden>
              Price
            </span>
            <span aria-hidden />
            {f.sizes.map((r, i) => {
              const re = errors.rows?.[i] ?? {};
              return (
                <div key={r.id ?? `new-${i}`} className={styles.sizeRow}>
                  <input
                    className={form.input}
                    inputMode="numeric"
                    aria-label={`Size ${i + 1}: serves`}
                    value={r.serves}
                    maxLength={3}
                    aria-invalid={!!re.serves || undefined}
                    onChange={(e) => setRow(i, { serves: e.target.value })}
                  />
                  <select
                    className={form.input}
                    aria-label={`Size ${i + 1}: tiers`}
                    value={r.tiers}
                    onChange={(e) => setRow(i, { tiers: e.target.value })}
                  >
                    {TIERS.map((t, n) => (
                      <option key={t} value={String(n + 1)}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    className={form.input}
                    inputMode="decimal"
                    placeholder="£"
                    aria-label={`Size ${i + 1}: price`}
                    value={r.price}
                    aria-invalid={!!re.price || undefined}
                    onChange={(e) => setRow(i, { price: e.target.value })}
                  />
                  {i === 0 ? (
                    <span>
                      <span className={styles.smallest}>{smallestNote(f)}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() =>
                        setF((x) => ({
                          ...x,
                          sizes: x.sizes.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      Remove
                      <span className={styles.visuallyHidden}>
                        {" "}
                        size {i + 1}
                      </span>
                    </button>
                  )}
                  {(re.serves || re.price) && (
                    <p className={styles.rowError} role="alert">
                      {[re.serves, re.price].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.textButton}
            onClick={() =>
              setF((x) => ({
                ...x,
                sizes: [
                  ...x.sizes,
                  { id: null, serves: "", tiers: "1", price: "" },
                ],
              }))
            }
          >
            + Add a size
          </button>
          <p className={form.hint}>
            Customers choose one of these on the cake page. The site shows the
            smallest price as “From £…” and the others as the difference (+£55,
            +£120). Changing a price never changes orders already placed.
          </p>

          <div className={form.field}>
            <span id="c-allergens-label" className={form.label}>
              Allergens it always contains
            </span>
            <button
              type="button"
              className={`${form.input} ${styles.allergenField}`}
              aria-labelledby="c-allergens-label c-allergens-value"
              aria-describedby="c-allergens-error"
              onClick={() => setPicker(true)}
            >
              <span id="c-allergens-value">{allergenSummary(f)}</span>
            </button>
            <FieldError
              id="c-allergens-error"
              message={
                errors.glutenKinds ??
                errors.nutKinds ??
                errors.alsoContains ??
                null
              }
            />
          </div>

          <fieldset className={form.pillSet}>
            <legend className={form.section}>Categories</legend>
            <div className={form.pills}>
              {CATEGORIES.map((k) => (
                <label key={k} className={form.pill}>
                  <input
                    type="checkbox"
                    checked={f.categories.includes(k)}
                    onChange={(e) =>
                      set(
                        "categories",
                        e.target.checked
                          ? [...f.categories, k]
                          : f.categories.filter((c) => c !== k),
                      )
                    }
                  />
                  <span>{label(k)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset
            className={form.pillSet}
            aria-describedby={errors.visible ? "c-visible-error" : undefined}
          >
            <legend className={form.section}>Visibility</legend>
            <div className={form.pills}>
              {(
                [
                  [true, "Showing on the site"],
                  [false, "Hidden"],
                ] as const
              ).map(([v, text]) => (
                <label key={text} className={form.pill}>
                  <input
                    type="radio"
                    name="visible"
                    checked={f.visible === v}
                    onChange={() => set("visible", v)}
                  />
                  <span>
                    {v ? (
                      <>
                        <em className={styles.wide}>Showing on the site</em>
                        <em className={styles.narrow}>Showing</em>
                      </>
                    ) : (
                      text
                    )}
                  </span>
                </label>
              ))}
            </div>
            <FieldError id="c-visible-error" message={errors.visible ?? null} />
          </fieldset>
          <p className={form.hint}>
            Hidden keeps the design and its photo, but takes it off the
            catalogue. Orders already placed are not affected.
          </p>

          {id !== null && (
            <Button
              variant="outline"
              className={styles.delete}
              onClick={() => setRemove(true)}
            >
              Delete this design
            </Button>
          )}
        </section>
      </div>

      <AllergenPicker
        open={picker}
        onClose={() => setPicker(false)}
        f={f}
        set={set}
        errors={errors}
        ticked={ticked}
      />

      {id !== null && (
        <RemoveDialog
          open={remove}
          onClose={() => setRemove(false)}
          id={id}
          name={initial.name}
          onDone={() => setSaved(true)}
        />
      )}
      <Overlay
        open={signIn === "asking"}
        onClose={() => setSignIn("no")}
        title="Sign in again"
        classNames={{ body: form.dialogBody }}
      >
        <SignInAgain onDone={() => setSignIn("back")} />
      </Overlay>
    </form>
  );
}

/** Allergens in this cake (1801:13494): the 14 boxes, which cereals / nuts when ticked, Also contains; Done. */
function AllergenPicker({
  open,
  onClose,
  f,
  set,
  errors,
  ticked,
}: {
  open: boolean;
  onClose: () => void;
  f: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  errors: CakeErrors;
  ticked: number;
}) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Allergens in this cake"
      description="Shown on the cake page, the order, the e-mails, the daily list and print. Option choices can add more."
      classNames={{ body: styles.pickerBody }}
    >
      <fieldset className={styles.pickerGrid}>
        <legend className={styles.visuallyHidden}>The 14 allergens</legend>
        {PICKER.map((a) => (
          <label key={a.key} className={form.tick}>
            <input
              type="checkbox"
              checked={f.allergens.includes(a.key)}
              onChange={(e) =>
                set(
                  "allergens",
                  e.target.checked
                    ? [...f.allergens, a.key]
                    : f.allergens.filter((x) => x !== a.key),
                )
              }
            />
            {a.label}
          </label>
        ))}
      </fieldset>
      {f.allergens.includes("cereals containing gluten") && (
        <div className={form.field}>
          <label htmlFor="c-glutenKinds" className={form.label}>
            Which cereals?
          </label>
          <input
            id="c-glutenKinds"
            className={form.input}
            value={f.glutenKinds}
            maxLength={60}
            placeholder="wheat"
            aria-invalid={!!errors.glutenKinds || undefined}
            onChange={(e) => set("glutenKinds", e.target.value)}
          />
          <FieldError
            id="c-glutenKinds-error"
            message={errors.glutenKinds ?? null}
          />
        </div>
      )}
      {f.allergens.includes("nuts") && (
        <div className={form.field}>
          <label htmlFor="c-nutKinds" className={form.label}>
            Which nuts?
          </label>
          <input
            id="c-nutKinds"
            className={form.input}
            value={f.nutKinds}
            maxLength={60}
            placeholder="almonds, hazelnuts"
            aria-invalid={!!errors.nutKinds || undefined}
            onChange={(e) => set("nutKinds", e.target.value)}
          />
          <FieldError id="c-nutKinds-error" message={errors.nutKinds ?? null} />
        </div>
      )}
      <div className={form.field}>
        <label htmlFor="c-alsoContains" className={form.label}>
          Also contains
        </label>
        <input
          id="c-alsoContains"
          className={form.input}
          value={f.alsoContains}
          maxLength={120}
          aria-invalid={!!errors.alsoContains || undefined}
          onChange={(e) => set("alsoContains", e.target.value)}
        />
        <p className={form.hint}>A free line for anything else.</p>
        <FieldError
          id="c-alsoContains-error"
          message={errors.alsoContains ?? null}
        />
      </div>
      <div className={styles.pickerEnd}>
        <Button onClick={onClose}>Done</Button>
        <span className={form.hint}>{ticked} ticked</span>
      </div>
    </Overlay>
  );
}

/** Delete this design (§9.13): Delete it · Hide it instead · Keep it. */
function RemoveDialog({
  open,
  onClose,
  id,
  name,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  id: number;
  name: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [line, setLine] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const act = (how: "delete" | "hide") =>
    start(async () => {
      setLine(null);
      const r = await removeCakeAction(id, how).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "saved" || r.kind === "gone") {
        onDone();
        router.push(
          `/admin/cakes?${how === "delete" ? "deleted" : "hidden"}=1`,
        );
        router.refresh();
        return;
      }
      setLine(
        r.kind === "signed-out"
          ? "You are signed out — nothing was changed. Sign in again."
          : "Nothing was changed — please try again.",
      );
    });
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={`Delete ${name} for good?`}
      description="It leaves the site now; past orders keep their copy. To take it off for a while, hide it instead."
      classNames={{ body: styles.removeBody }}
    >
      {line && (
        <p className={form.alert} role="alert">
          {line}
        </p>
      )}
      <Button busy={busy} busyLabel="Deleting" onClick={() => act("delete")}>
        Delete it
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => act("hide")}>
        Hide it instead
      </Button>
      <Button variant="outline" disabled={busy} onClick={onClose}>
        Keep it
      </Button>
    </Overlay>
  );
}
