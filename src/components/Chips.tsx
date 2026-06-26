import { Opt } from "../labels";

export function ChipSelect(props: {
  options: Opt<string>[];
  value: string | undefined;
  onChange: (v: string) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div className="chips">
      {props.options.map((o) => {
        const on = props.value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            className={"chip" + (on ? " chip--on" : "")}
            onClick={() =>
              props.onChange(on && props.allowDeselect ? "" : o.value)
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChipMulti(props: {
  options: Opt<string>[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) =>
    props.onChange(
      props.values.includes(v)
        ? props.values.filter((x) => x !== v)
        : [...props.values, v],
    );
  return (
    <div className="chips">
      {props.options.map((o) => {
        const on = props.values.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            className={"chip" + (on ? " chip--on" : "")}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({
  url,
  name,
  large,
}: {
  url?: string | null;
  name: string;
  large?: boolean;
}) {
  const cls = "avatar" + (large ? " avatar--lg" : "");
  if (url) return <img className={cls} src={url} alt={name} />;
  return <div className={cls}>{(name || "?").charAt(0).toUpperCase()}</div>;
}
