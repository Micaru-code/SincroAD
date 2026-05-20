class ADUser {
    constructor(data, source) {
        this.nombre = data.Name;
        this.username = data.SamAccountName;
        this.dominio = source;
        this.newUsername = data.SamAccountName; // Nombre editable
        this.hasConflict = false;
        this.selected = true;
    }
}

class ADController {
    constructor() {
        // Carga automática desde los scripts previos
        this.lidlUsers = DATA_LIDL.Users.map(u => new ADUser(u, 'LIDL'));
        this.mercadonaUsers = DATA_MERCADONA.Users.map(u => new ADUser(u, 'MERCADONA'));
        this.config = { from: 'LIDL', to: 'MERCADONA' };
        this.renderInitial();
    }

    renderInitial() {
        const app = document.getElementById('app');
        const source = (this.config.from === 'LIDL') ? this.lidlUsers : this.mercadonaUsers;
        const target = (this.config.from === 'LIDL') ? this.mercadonaUsers : this.lidlUsers;

        app.innerHTML = `
            <header>
                <div class="logo">SincroAD <span>System</span></div>
                <div class="status">Sincronización: <strong>${this.config.from} ➔ ${this.config.to}</strong></div>
            </header>
            <div class="tool-bar">
                <button onclick="appCtrl.swap()" class="btn-secondary">🔄 Invertir Dirección</button>
                <button onclick="appCtrl.checkConflicts()" class="btn-accent">🔍 Comprobar Conflictos</button>
            </div>
            <main id="main-content">
                <div class="dual-panel fade-in">
                    <section class="panel">
                        <h3>Usuarios en Dominio Origen</h3>
                        <div class="list">${source.map(u => `<div class="user-item"><span>${u.nombre}</span><span class="u-nick">@${u.username}</span></div>`).join('')}</div>
                    </section>
                </div>
            </main>
            <footer id="footer" class="hidden"></footer>
        `;
    }

    swap() {
        this.config.from = (this.config.from === 'LIDL') ? 'MERCADONA' : 'LIDL';
        this.config.to = (this.config.to === 'MERCADONA') ? 'LIDL' : 'MERCADONA';
        this.renderInitial();
    }

    checkConflicts() {
        const source = (this.config.from === 'LIDL') ? this.lidlUsers : this.mercadonaUsers;
        const target = (this.config.from === 'LIDL') ? this.mercadonaUsers : this.lidlUsers;
        const targetNames = target.map(u => u.username.toLowerCase());
        
        let totalConflicts = 0;
        source.forEach(u => {
            u.hasConflict = targetNames.includes(u.newUsername.toLowerCase());
            if (u.hasConflict) totalConflicts++;
        });

        this.renderConflictTable(source, totalConflicts);
    }

    renderConflictTable(users, count) {
        const main = document.getElementById('main-content');
        const footer = document.getElementById('footer');

        main.innerHTML = `
            <div class="card fade-in">
                <table>
                    <thead><tr><th>Nombre</th><th>Nickname Destino (Editar)</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${users.map((u, i) => `
                            <tr class="${u.hasConflict ? 'conflict-row' : ''}">
                                <td>${u.nombre}</td>
                                <td><input type="text" value="${u.newUsername}" onchange="appCtrl.updateName(${i}, this.value)" class="u-input"></td>
                                <td>${u.hasConflict ? '<span class="badge-error">CONFLICTO</span>' : '<span class="badge-ok">VALIDADO</span>'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;

        footer.classList.remove('hidden');
        if (count > 0) {
            footer.innerHTML = `<span class="text-error">⚠️ Hay ${count} conflictos. Corrige y vuelve a comprobar.</span>`;
        } else {
            footer.innerHTML = `<button class="btn-primary" onclick="appCtrl.export()">✅ Generar Archivo de Migración</button>`;
        }
    }

    updateName(index, value) {
        const source = (this.config.from === 'LIDL') ? this.lidlUsers : this.mercadonaUsers;
        source[index].newUsername = value;
        // No refresca automáticamente para no molestar al escribir
    }

    export() {
        const source = (this.config.from === 'LIDL') ? this.lidlUsers : this.mercadonaUsers;
        const result = { Users: source.map(u => ({ ...u })) };
        const blob = new Blob([JSON.stringify(result, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `migracion_final.json`;
        a.click();
    }
}

const appCtrl = new ADController();