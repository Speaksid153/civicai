export default function SearchBar({ search, setSearch }) {
  return (
    <div className="ds-search-wrapper" style={{ width: "100%" }}>
      <span className="material-symbols-outlined ds-search-icon">search</span>
      <input
        type="text"
        placeholder="Search by description, category, department..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="ds-search"
      />
    </div>
  );
}
