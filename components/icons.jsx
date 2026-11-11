// Small inline SVG icons. No icon library is needed.

function Icon({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ForwardIcon() {
  return (
    <Icon>
      <path d="M12 20V6M6 11l6-6 6 6" />
    </Icon>
  );
}

export function TurnLeftIcon() {
  return (
    <Icon>
      <path d="M17 20v-9H7M11 7l-4 4 4 4" />
    </Icon>
  );
}

export function TurnRightIcon() {
  return (
    <Icon>
      <path d="M7 20v-9h10M13 7l4 4-4 4" />
    </Icon>
  );
}

export function StarIcon() {
  return (
    <Icon fill="currentColor" stroke="none">
      <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
    </Icon>
  );
}

export function PlayIcon() {
  return (
    <Icon fill="currentColor" stroke="none">
      <path d="M7 4v16l13-8L7 4Z" />
    </Icon>
  );
}

export function PauseIcon() {
  return (
    <Icon fill="currentColor" stroke="none">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </Icon>
  );
}

export function StopIcon() {
  return (
    <Icon fill="currentColor" stroke="none">
      <path d="M5 5h14v14H5z" />
    </Icon>
  );
}

export function EraseIcon() {
  return (
    <Icon strokeWidth="2.5">
      <path d="M9 5h12v14H9l-6-7 6-7ZM12 9l6 6M18 9l-6 6" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon strokeWidth="2.5">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </Icon>
  );
}

export function SoundOnIcon() {
  return (
    <Icon strokeWidth="2.5">
      <path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </Icon>
  );
}

export function SoundOffIcon() {
  return (
    <Icon strokeWidth="2.5">
      <path d="M4 9h4l5-4v14l-5-4H4zM16 9l6 6M22 9l-6 6" />
    </Icon>
  );
}

export function ChevronIcon({ direction }) {
  return (
    <Icon fill="currentColor" stroke="none">
      {direction === "left" ? (
        <path d="M16 5v14l-9-7 9-7Z" />
      ) : (
        <path d="M8 5v14l9-7-9-7Z" />
      )}
    </Icon>
  );
}