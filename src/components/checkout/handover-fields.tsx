"use client";

import { useState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import {
  collectionText,
  deliveryAreaText,
  HANDOVER_COPY,
  inDistricts,
  isUkPostcode,
  normalisePostcode,
  outwardCode,
  WINDOWS,
  type HandoverErrors,
  type HandoverInput,
} from "@/lib/handover";
import styles from "./checkout.module.css";

export type HandoverPlace = {
  area: string;
  districts: string;
  chargePence: number;
  address: string;
};

/**
 * Step 2's handover (§5.2; desktop 637:3274 ff., phone 828:6108): Delivered to you / Collect from me as two choice
 * cards, then for delivery the address, town, postcode (checked on blur against the districts in Settings) and the
 * three windows. The answers are controlled here, so they stay as typed whatever the server answers.
 */
export function HandoverFields({
  values,
  onChange,
  errors,
  place,
}: {
  values: HandoverInput;
  onChange: (v: HandoverInput) => void;
  errors: HandoverErrors;
  place: HandoverPlace;
}) {
  const [checked, setChecked] = useState(values.postcode !== "");
  const set = (k: keyof HandoverInput, v: string) =>
    onChange({ ...values, [k]: v });
  const delivery = values.handover === "delivery";
  const outward = outwardCode(values.postcode);
  const outside =
    delivery &&
    ((checked &&
      isUkPostcode(values.postcode) &&
      !inDistricts(outward, place.districts)) ||
      errors.postcode === "outside");
  const postcodeError =
    errors.postcode && errors.postcode !== "outside" ? errors.postcode : null;

  return (
    <div className={styles.handover}>
      <fieldset
        className={styles.group}
        aria-describedby={errors.handover ? "handover-error" : undefined}
      >
        <legend className={styles.sectionHeading}>
          How would you like it?
        </legend>
        <div className={styles.cards}>
          {(
            [
              [
                "delivery",
                "Delivered to you",
                deliveryAreaText(place.chargePence, place.area),
              ],
              ["collection", "Collect from me", collectionText(place.address)],
            ] as const
          ).map(([key, title, text]) => (
            <label
              key={key}
              className={styles.card}
              data-checked={values.handover === key || undefined}
              data-pressable
            >
              <input
                type="radio"
                name="handover"
                value={key}
                checked={values.handover === key}
                onChange={() => set("handover", key)}
                className="visually-hidden"
                data-invalid={errors.handover ? "" : undefined}
              />
              <span className={styles.cardTitle}>{title}</span>
              <span className={styles.cardText}>{text}</span>
            </label>
          ))}
        </div>
        <FieldError id="handover-error" message={errors.handover} />
      </fieldset>

      {/* Always in the form, so typed answers stay in the draft and it works without JavaScript; shown only while
          Delivery is chosen (CSS :has, so also without JavaScript). */}
      <div className={styles.deliveryOnly}>
        <fieldset className={styles.group}>
          <legend className={styles.sectionHeading}>Where to?</legend>
          <div className={styles.address}>
            <TextField
              label="Address"
              labelStyle="plain"
              name="address"
              autoComplete="address-line1"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              error={errors.address}
            />
            <div className={styles.townRow}>
              <TextField
                label="Town"
                labelStyle="plain"
                name="town"
                autoComplete="address-level2"
                value={values.town}
                onChange={(e) => set("town", e.target.value)}
                error={errors.town}
              />
              <TextField
                label="Postcode"
                labelStyle="plain"
                name="postcode"
                autoComplete="postal-code"
                autoCapitalize="characters"
                value={values.postcode}
                onChange={(e) => {
                  setChecked(false);
                  set("postcode", e.target.value);
                }}
                onBlur={() => {
                  if (values.postcode.trim())
                    set("postcode", normalisePostcode(values.postcode));
                  setChecked(true);
                }}
                error={postcodeError}
              />
            </div>
          </div>
          {outside && (
            <div className={styles.outside}>
              <Notice
                tone="error"
                title={HANDOVER_COPY.outsideTitle(outward, place.area)}
              >
                {HANDOVER_COPY.outsideText}
              </Notice>
            </div>
          )}
        </fieldset>

        <fieldset
          className={styles.group}
          aria-describedby={errors.window ? "window-error" : undefined}
        >
          <legend className={styles.sectionHeading}>What time?</legend>
          <div className={styles.windows}>
            {WINDOWS.map((w) => (
              <label
                key={w.key}
                className={styles.window}
                data-checked={values.window === w.key || undefined}
                data-pressable
              >
                <input
                  type="radio"
                  name="window"
                  value={w.key}
                  checked={values.window === w.key}
                  onChange={() => set("window", w.key)}
                  className="visually-hidden"
                  aria-label={`${w.name} · ${w.times}`}
                  data-invalid={errors.window ? "" : undefined}
                />
                <span aria-hidden>
                  {w.name}
                  <span className={styles.wideDay}> · {w.times}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id="window-error" message={errors.window} />
          <p className={styles.windowNote}>
            {deliveryAreaText(place.chargePence, place.area)}{" "}
            {HANDOVER_COPY.textLine}
          </p>
        </fieldset>
      </div>
    </div>
  );
}
