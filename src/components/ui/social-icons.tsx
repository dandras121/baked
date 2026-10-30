/** Instagram and Facebook marks, 17 × 17 (1373:10133, 1373:10104); decorative, the link text names the network. */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 17 17" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.0625">
        <path d="M10.7833 2H5.68333C3.64908 2 2 3.64908 2 5.68333V10.7833C2 12.8176 3.64908 14.4667 5.68333 14.4667H10.7833C12.8176 14.4667 14.4667 12.8176 14.4667 10.7833V5.68333C14.4667 3.64908 12.8176 2 10.7833 2Z" />
        <path d="M8.90417 11.8083C10.5081 11.8083 11.8083 10.5081 11.8083 8.90417C11.8083 7.30024 10.5081 6 8.90417 6C7.30024 6 6 7.30024 6 8.90417C6 10.5081 7.30024 11.8083 8.90417 11.8083Z" />
      </g>
      <path
        fill="currentColor"
        d="M11.8146 5.62917C12.2645 5.62917 12.6292 5.26447 12.6292 4.81458C12.6292 4.3647 12.2645 4 11.8146 4C11.3647 4 11 4.3647 11 4.81458C11 5.26447 11.3647 5.62917 11.8146 5.62917Z"
      />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 17 17" aria-hidden>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.0625"
        strokeLinecap="round"
      >
        <path d="M8.23333 14.4667C11.6759 14.4667 14.4667 11.6759 14.4667 8.23333C14.4667 4.79076 11.6759 2 8.23333 2C4.79076 2 2 4.79076 2 8.23333C2 11.6759 4.79076 14.4667 8.23333 14.4667Z" />
        <path d="M10.825 6H9.7625C9.58576 6 9.41076 6.03481 9.24747 6.10245C9.08419 6.17008 8.93582 6.26921 8.81085 6.39419C8.68588 6.51916 8.58675 6.66752 8.51911 6.83081C8.45148 6.99409 8.41667 7.1691 8.41667 7.34583V14.7833M7 9.32917H10.1167" />
      </g>
    </svg>
  );
}
