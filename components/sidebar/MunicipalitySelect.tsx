"use client";

type MunicipalityOption = {
  code: string;
  name: string;
};

type MunicipalitySelectProps = {
  municipalities: MunicipalityOption[];
  value: string | null;
  onChange: (code: string | null) => void;
};

export default function MunicipalitySelect({ municipalities, value, onChange }: MunicipalitySelectProps) {
  return (
    <label className="municipality-select">
      <span>Municipality</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">All municipalities</option>
        {municipalities.map((municipality) => (
          <option key={municipality.code} value={municipality.code}>
            {municipality.name}
          </option>
        ))}
      </select>
    </label>
  );
}
