import { PageWidth } from "@/components/page-shell/page-shell";
import styles from "./build-stub.module.css";

/**
 * A temporary stand-in for a page that a later slice builds, so the header can be clicked and
 * scrolled now. Each stub is replaced by its real page in the slice named.
 */
export function BuildStub({ title, slice }: { title: string; slice: string }) {
  return (
    <PageWidth className={styles.stub}>
      <h1 className="type-heading-sm">{title}</h1>
      <p className="type-body">This page is built in slice {slice}.</p>
    </PageWidth>
  );
}
