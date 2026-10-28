// References (§10.7): BBL-YYYY-NNNN (5 digits after 9999), BBL-YYYY-E-NNNN, BBL-YYYY-C-NNNN.
const seq = (n: number) => {
  if (!Number.isInteger(n) || n < 1)
    throw new Error(`Sequence must be 1 or more, got ${n}`);
  return String(n).padStart(4, "0");
};
export const orderNumber = (year: number, n: number) => `BBL-${year}-${seq(n)}`;
export const enquiryReference = (year: number, n: number) =>
  `BBL-${year}-E-${seq(n)}`;
export const complaintReference = (year: number, n: number) =>
  `BBL-${year}-C-${seq(n)}`;
