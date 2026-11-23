// Список з пошуком та розгорнуттям:
// - показує initialVisibleCount строк; «Показати ещё (N)» / «Згорнути» у внизу;
// - пошук: filterFn(row, query) → true/false (по імені);
// - шуковий рядок показує всі відповідні строки (не залежно від стану розгорнення);
// - коли запит порожній — повертається у згорнутий вид.

export function createExpandableList({
    container,
    rows,
    renderRow,
    filterFn,
    initialVisibleCount = 6,
    searchInput = null,
}) {
    const state = { expanded: false, query: "" };

    function matchedRows() {
        const query = state.query.trim().toLowerCase();
        return query ? rows.filter((row) => filterFn(row, query)) : [...rows];
    }

    function visibleRows() {
        const matched = matchedRows();

        if (state.expanded || state.query.trim()) {
            return matched;
        }

        return matched.slice(0, initialVisibleCount);
    }

    function updateToggle() {
        const collapsed =
            !state.expanded && !state.query.trim()
                ? Math.max(0, rows.length - initialVisibleCount)
                : 0;
        const show = collapsed > 0 || (state.expanded && !state.query.trim());

        if (!show) {
            toggleButton.hidden = true;
            return;
        }

        toggleButton.hidden = false;
        toggleButton.textContent = collapsed > 0 ? `Показати ещё (${collapsed})` : "Згорнути";
    }

    function render() {
        container.innerHTML = "";
        visibleRows().forEach((row) => container.appendChild(renderRow(row)));
        container.appendChild(toggleButton);
        updateToggle();
    }

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "expandable-list-toggle primary-button";
    toggleButton.addEventListener("click", () => {
        state.expanded = !state.expanded;
        render();
    });

    searchInput?.addEventListener("input", () => {
        state.query = searchInput.value;
        state.expanded = false;
        render();
    });

    render();

    return { state, render, toggleButton };
}
