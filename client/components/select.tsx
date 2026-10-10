"use client";
import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Second line shown in the menu only. */
  hint?: string;
};

/** Themed dropdown that replaces the native <select> (keyboard + screen reader friendly). */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  disabled = false,
  variant = "field",
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name. */
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** "field" fills a form row; "inline" is a compact toolbar control. */
  variant?: "field" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open)
      list.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }
  function pick(i: number) {
    onChange(options[i].value);
    setOpen(false);
  }
  function onKey(e: KeyboardEvent) {
    if (disabled) return;
    const last = options.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => (open ? setActive((i) => Math.min(last, i + 1)) : show()),
      ArrowUp: () => (open ? setActive((i) => Math.max(0, i - 1)) : show()),
      Home: () => open && setActive(0),
      End: () => open && setActive(last),
      Enter: () => (open ? pick(active) : show()),
      " ": () => (open ? pick(active) : show()),
      Escape: () => setOpen(false),
      Tab: () => setOpen(false),
    };
    const action = keys[e.key];
    if (action) {
      if (e.key !== "Tab") e.preventDefault();
      action();
    }
  }

  return (
    <div
      ref={root}
      className={`select select-${variant} ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}
    >
      <button
        type="button"
        className="select-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
      >
        {icon}
        <span className="select-value">{selected?.label}</span>
        <ChevronDown size={15} className="select-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul className="select-menu" role="listbox" id={`${id}-list`} ref={list} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              className={`${i === active ? "active" : ""} ${o.value === value ? "selected" : ""}`}
              onPointerEnter={() => setActive(i)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
            >
              <span>
                {o.label}
                {o.hint && <small>{o.hint}</small>}
              </span>
              {o.value === value && <Check size={15} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
