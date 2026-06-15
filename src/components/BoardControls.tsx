import type { SortMode } from "../types";

interface BoardControlsProps {
  search: string;
  sort: SortMode;
  onSearch: (value: string) => void;
  onSort: (value: SortMode) => void;
}

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "account", label: "Account name" },
  { value: "type", label: "Item type" },
  { value: "priority", label: "Priority" },
  { value: "unclaimed", label: "Unclaimed first" },
];

export function BoardControls({
  search,
  sort,
  onSearch,
  onSort,
}: BoardControlsProps) {
  return (
    <section className="controls" aria-label="Board controls">
      <label className="search-field">
        <span>Search</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="item, owner, rare affix..."
          type="search"
        />
      </label>
      <label>
        <span>Sort</span>
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as SortMode)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
