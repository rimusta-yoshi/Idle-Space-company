// Warehouse App
// Shows per-resource inventory totals, grouping all storage nodes of the same resource type

class WarehouseApp extends App {
    constructor() {
        super();
        this.id = 'warehouse';
        this.title = 'INVENTORY CONTROL SYSTEM';
        this.icon = 'WH';
        this.updateInterval = null;
    }

    mount(contentElement) {
        const template = document.getElementById('warehouse-app-template');
        if (!template) throw new Error('Warehouse app template not found');

        const content = template.content.cloneNode(true);
        contentElement.appendChild(content);

        this.updateDisplay(contentElement);
        this.startUpdateLoop(contentElement);
    }

    startUpdateLoop(root) {
        this.updateInterval = setInterval(() => this.updateDisplay(root), 500);
    }

    updateDisplay(root) {
        const gameInstance = window.gameInstance;
        if (!gameInstance?.canvas) return;

        const storageNodes = gameInstance.canvas.nodes.filter(n => n.buildingDef?.isStorage);
        const tbody = root.querySelector('.warehouse-tbody');
        if (!tbody) return;

        if (storageNodes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="wh-empty">No storage nodes on canvas. Build a Storage unit and connect it to your factory chain.</td></tr>';
            return;
        }

        // Group nodes by storedResourceType — null/undefined nodes go under key '__empty__'
        const groups = new Map();
        storageNodes.forEach(node => {
            const key = node.storedResourceType || '__empty__';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(node);
        });

        // Build aggregated row data — read rates computed by game.js each tick
        const rows = [];
        groups.forEach((nodes, key) => {
            const res = key === '__empty__' ? null : key;
            const resDef = res ? RESOURCES[res] : null;
            const totalInventory = nodes.reduce((s, n) => s + (n.inventory || 0), 0);
            const totalCap = nodes.reduce((s, n) => s + (n.inventoryCapacity || 0), 0);
            const inflow = nodes.reduce((s, n) => s + (n.inflowRate || 0), 0);
            const outflow = nodes.reduce((s, n) => s + (n.outflowRate || 0), 0);
            rows.push({ res, resDef, totalInventory, totalCap, inflow, outflow });
        });

        // Reconcile DOM rows keyed by resource type
        const existingRows = new Map();
        tbody.querySelectorAll('tr[data-res-key]').forEach(tr => {
            existingRows.set(tr.dataset.resKey, tr);
        });

        const activeKeys = new Set(rows.map(r => r.res || '__empty__'));
        existingRows.forEach((tr, key) => {
            if (!activeKeys.has(key)) tr.remove();
        });

        rows.forEach(({ res, resDef, totalInventory, totalCap, inflow, outflow }) => {
            const key = res || '__empty__';
            const cap = totalCap || 1;
            const pct = Math.min(100, (totalInventory / cap) * 100);
            const net = inflow - outflow;

            const statusClass = !res ? 'yellow' : net > 0.01 ? 'green' : net < -0.01 ? 'red' : 'yellow';
            const netSign = net >= 0 ? '+' : '';
            const netColor = net > 0.01 ? '#4a8a4a' : net < -0.01 ? '#cc3333' : '#e8c840';
            const iconHtml = resDef
                ? `<span class="material-symbols-outlined wh-icon">${resDef.icon}</span>`
                : `<span class="material-symbols-outlined wh-icon">inventory_2</span>`;
            const resName = resDef ? resDef.name.toUpperCase() : 'EMPTY';
            const storedText = res
                ? `${formatNumber(totalInventory)} / ${formatNumber(totalCap)}`
                : '— / —';

            let row = existingRows.get(key);
            if (!row) {
                row = document.createElement('tr');
                row.className = 'resource-row';
                row.dataset.resKey = key;
                tbody.appendChild(row);
            }

            row.innerHTML = `
                <td><div class="status-indicator ${statusClass}"></div></td>
                <td class="resource-name">${iconHtml} ${resName}</td>
                <td class="resource-amount ${pct > 90 ? 'wh-near-full' : ''}">${storedText}</td>
                <td class="output-rate" style="color:${inflow > 0.001 ? '#4a8a4a' : '#555555'}">${inflow > 0.001 ? '+' + formatRatePerMin(inflow) : '—'}</td>
                <td class="net-rate" style="color:${netColor}">${res ? netSign + formatRatePerMin(net) : '—'}</td>
            `;
        });

        // Reorder: committed resources first (alphabetically), then empty nodes last
        const sortedKeys = [...activeKeys].sort((a, b) => {
            if (a === '__empty__') return 1;
            if (b === '__empty__') return -1;
            return a.localeCompare(b);
        });
        sortedKeys.forEach(key => {
            const row = tbody.querySelector(`tr[data-res-key="${key}"]`);
            if (row) tbody.appendChild(row);
        });
    }


    close() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }

    getSaveData() { return {}; }
    loadSaveData(_data) {}
}
