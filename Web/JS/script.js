class SincroAD {
    constructor() {
        this.base = document.getElementById('app');

        // Arrays de datos para los usuarios cargados de BD
        this.vLIDL = [];
        this.vMERCADONA = [];

        // Estado de la aplicación
        this.aiMode = 'ad';
        this.modoExternos = false;
        this.direccionMercaLidl = false; // Controla el sentido visual del merge

        this.init();
    }

    async init() {
        await this.cargarDatosYDibujar();
    }

    async cargarDatosYDibujar() {
        try {
            // Petición a tu API Node.js (Ajusta la IP si es necesario)
            const resL = await fetch('http://192.168.1.100:3000/api/usuarios/lidl');
            this.vLIDL = await resL.json();

            const resM = await fetch('http://192.168.1.100:3000/api/usuarios/mercadona');
            this.vMERCADONA = await resM.json();

            this.dibujar();
        } catch (error) {
            console.error("Error cargando datos de MySQL:", error);
        }
    }

validar(usernameOrigen, listaDestino, soloExternos) {
    // REGLA DE ORO: En modo externo NUNCA hay conflicto
    if (soloExternos) {
        return false; 
    }

    // En modo completo, comprobamos si el username existe en el otro lado
    if (usernameOrigen && listaDestino) {
        return listaDestino.some(u => {
            const uDestino = (u.Username || u.username || "").toLowerCase();
            return uDestino === usernameOrigen.toLowerCase();
        });
    }
    return false;
}

    dibujar() {
        this.base.innerHTML = "";

        // Calculamos si hay conflictos en cualquiera de las dos listas
        const hayConflictosLidl = this.vLIDL.some(u => this.validar(u.Username || u.username || "", this.vMERCADONA, this.modoExternos));
        const hayConflictosMerca = this.vMERCADONA.some(u => this.validar(u.Username || u.username || "", this.vLIDL, this.modoExternos));
        const tieneConflictosActivos = hayConflictosLidl || hayConflictosMerca;

        // Cabecera
        let cabeza = document.createElement('div');
        cabeza.className = "header-spa";
        cabeza.innerHTML = `<div class="logo">Sincro<span>AD</span></div>`;
        this.base.appendChild(cabeza);

        // Contenedor de columnas
        let contenedorColumnas = document.createElement('div');
        contenedorColumnas.className = "contenedor-columnas";
        contenedorColumnas.style.display = "grid";
        contenedorColumnas.style.gridTemplateColumns = "1fr 1fr";
        contenedorColumnas.style.gap = "40px";
        contenedorColumnas.style.width = "95%";
        contenedorColumnas.style.maxWidth = "1400px";
        contenedorColumnas.style.margin = "0 auto";

        const crearColumna = (titulo, lista, listaComparar, dominio) => {
            let col = document.createElement('div');
            col.className = "card";
            col.innerHTML = `<h2 style="text-align:center">${titulo} (${dominio})</h2><hr style="border:1px solid #262626; margin-bottom:15px">`;

            lista.forEach(usuario => {
                const uUser = usuario.Username || usuario.username;
                let tieneConflicto = this.validar(uUser || "", listaComparar, this.modoExternos);

                let fila = document.createElement('div');
                fila.className = "user-row";
                if (usuario.isNew) fila.style.borderLeft = "5px solid #10b981";

                fila.innerHTML = `
                <div class="user-info">
                    <strong>${usuario.Name || usuario.nombre}</strong>
                    <small style="color:#737373">${uUser || 'S/N'}</small>
                </div>
                <span class="badge ${tieneConflicto ? 'badge-conflict' : 'badge-ok'}" style="cursor: ${tieneConflicto ? 'pointer' : 'default'}">
                    ${tieneConflicto ? 'CONFLICTO' : 'LIMPIO'}
                </span>
            `;

                if (tieneConflicto) {
                    fila.querySelector('.badge-conflict').onclick = () => this.pantallaResolucion(usuario, listaComparar);
                }
                col.appendChild(fila);
            });
            return col;
        };

        contenedorColumnas.append(
            crearColumna("LIDL", this.vLIDL, this.vMERCADONA, "LIDL.COM"),
            crearColumna("MERCADONA", this.vMERCADONA, this.vLIDL, "MERCADONA.COM")
        );
        this.base.appendChild(contenedorColumnas);

        // Llamamos a los controles pasando el estado de bloqueo
        this.dibujarControles(tieneConflictosActivos);
    }

    dibujarControles(bloqueo) {
        let cajaBotonera = document.createElement('div');
        cajaBotonera.style.display = "flex";
        cajaBotonera.style.flexDirection = "column";
        cajaBotonera.style.alignItems = "center";
        cajaBotonera.style.gap = "15px";
        cajaBotonera.style.marginTop = "30px";
        cajaBotonera.style.paddingBottom = "50px";

        let filaSuperior = document.createElement('div');
        filaSuperior.style.display = "flex";
        filaSuperior.style.gap = "15px";

        // BOTÓN 1: Modo
        let btnModo = document.createElement('button');
        btnModo.textContent = `MODO: ${this.modoExternos ? 'EXTERNOS' : 'COMPLETA'}`;
        btnModo.className = "cambio";
        btnModo.onclick = () => { this.modoExternos = !this.modoExternos; this.dibujar(); };

        // BOTÓN 2: Dirección (RECUPERADO)
        let btnDireccion = document.createElement('button');
        btnDireccion.textContent = this.direccionMercaLidl ? "MERCADONA ➔ LIDL" : "LIDL ➔ MERCADONA";
        btnDireccion.className = "cambio";
        btnDireccion.style.color = "#fbbf24"; // Color ámbar para diferenciarlo
        btnDireccion.onclick = () => { this.direccionMercaLidl = !this.direccionMercaLidl; this.dibujar(); };

        // BOTÓN 3: Alta
        let btnAlta = document.createElement('button');
        btnAlta.textContent = "AÑADIR USUARIO";
        btnAlta.className = "cambio";
        btnAlta.onclick = () => this.pantallaAlta();

        filaSuperior.append(btnModo, btnDireccion, btnAlta);

        // BOTÓN FINAL: Ejecutar Migración
        let btnMerge = document.createElement('button');
        btnMerge.className = "cambio";
        btnMerge.style.width = "500px";
        btnMerge.disabled = bloqueo; // DESHABILITADO SI HAY CONFLICTOS

        if (bloqueo) {
            btnMerge.textContent = "BLOQUEADO: RESUELVE CONFLICTOS";
            btnMerge.style.opacity = "0.4";
            btnMerge.style.cursor = "not-allowed";
            btnMerge.style.background = "#404040";
            btnMerge.style.color = "#a3a3a3";
            btnMerge.style.border = "1px solid #525252";
        } else {
            btnMerge.textContent = "EJECUTAR MIGRACIÓN TOTAL EN DB";
            btnMerge.style.background = "#10b981";
            btnMerge.style.color = "#0a0a0a";
            btnMerge.style.cursor = "pointer";
        }

        btnMerge.onclick = () => this.ejecutarMergeServidor();

        cajaBotonera.append(filaSuperior, btnMerge);
        this.base.appendChild(cajaBotonera);
    }

async ejecutarMergeServidor() {
    const modoStr = this.modoExternos ? 'externos' : 'completa';
    const dominioDestino = this.direccionMercaLidl ? "Lidl" : "Mercadona";

    // CORRECCIÓN: Ahora aceptamos 'domOriginal' como segundo parámetro
const normalizar = (lista, domOriginal) => {
    const dominioDestinoFinal = this.direccionMercaLidl ? "lidl.com" : "mercadona.com";

    return lista.map(u => {
        let nombreFinal = u.Name || u.nombre || "Sin Nombre";
        let userFinal = u.Username || u.username || "sin_username";
        let emailFinal = u.Email || u.email || "";

        // Si es MODO COMPLETA, forzamos que el email sea @dominioDestino
        if (!this.modoExternos) {
            emailFinal = userFinal.split('@')[0] + "@" + dominioDestinoFinal;
        }

        return {
            Name: nombreFinal,
            Username: userFinal,
            Email: emailFinal,
            dominio_origen: domOriginal
        };
    });
};

    // CORRECCIÓN: Pasamos el nombre del dominio a cada llamada
    const listaTotal = [
        ...normalizar(this.vLIDL, "Lidl"),
        ...normalizar(this.vMERCADONA, "Mercadona")
    ];

    const nombresVistos = new Set();
    const duplicados = [];
    listaTotal.forEach(u => {
        const key = u.Username.toLowerCase();
        if (nombresVistos.has(key)) duplicados.push(u.Username);
        nombresVistos.add(key);
    });

    let mensajeConfirmacion = "Confirmar migracion en modo " + modoStr.toUpperCase() + "\n\n" +
                              "Destino final: " + dominioDestino + "\n" +
                              "Total usuarios: " + listaTotal.length + "\n" +
                              "Se creara una nueva tabla independiente en la base de datos.";
    
    if (duplicados.length > 0) {
        mensajeConfirmacion += "\n\nAviso: Se han detectado " + duplicados.length + " duplicados que se guardaran con IDs distintos:\n" +
                              "[" + duplicados.join(", ") + "]";
    }

    if (!confirm(mensajeConfirmacion)) return;

    try {
        const res = await fetch('http://192.168.1.100:3000/api/ejecutar-migracion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                modo: modoStr, 
                usuarios: listaTotal,
                destino: dominioDestino 
            })
        });
        
        const data = await res.json();
        if (res.ok) {
            alert("MIGRACION EXITOSA\n" + data.message);
            await this.cargarDatosYDibujar();
        } else {
            alert("ERROR EN EL SERVIDOR: " + (data.message || data.error));
        }
    } catch (e) {
        alert("ERROR DE CONEXION: No se pudo contactar con la API.");
    }
}

pantallaResolucion(usuario, listaComparar) {
    this.base.innerHTML = "";
    
    const dominioDestinoFinal = this.direccionMercaLidl ? "lidl.com" : "mercadona.com";
    

    this.base.innerHTML = "";
    
    let currentName = usuario.Name || usuario.nombre || "";
    let currentUser = usuario.Username || usuario.username || "";
    let currentEmail = usuario.Email || usuario.email || "";

    let caja = document.createElement('div');
    caja.className = "card";
    caja.style.maxWidth = "500px";
    caja.style.margin = "50px auto";
    caja.innerHTML = `
        <h2 style="color: #fbbf24">Resolución Manual de Conflicto</h2>
        <p style="font-size: 0.9rem; margin-bottom: 20px; color: #a3a3a3">Modifica los campos para evitar duplicados en el destino.</p>
        
        <label style="font-size:0.8rem; color:#10b981">Nombre Visual (Name / CN)</label>
        <input type="text" id="res-name" value="${currentName}" class="input-resolucion">
        
        <label style="font-size:0.8rem; color:#10b981">Nombre de Usuario (Username / SamAccountName)</label>
        <input type="text" id="res-user" value="${currentUser}" class="input-resolucion">
        
        <label style="font-size:0.8rem; color:#10b981">Correo Electrónico (Email Address)</label>
        <input type="text" id="res-email" value="${currentEmail}" class="input-resolucion">

        <div id="status-msg" style="margin-top: 15px; font-size: 0.8rem; min-height: 20px"></div>

        <button id="save-res" class="cambio" style="width:100%; margin-top: 20px">Guardar Cambios</button>
        <button id="cancel-res" class="btn-mini" style="width:100%; margin-top:10px">Cancelar</button>
    `;
    this.base.appendChild(caja);

    // Estilos rápidos para los inputs
    const inputs = caja.querySelectorAll('.input-resolucion');
    inputs.forEach(i => {
        i.style.width = "100%";
        i.style.marginBottom = "15px";
        i.style.padding = "10px";
        i.style.background = "#0a0a0a";
        i.style.color = "white";
        i.style.border = "1px solid #404040";
    });

    const btnGuardar = document.getElementById('save-res');
    const msgStatus = document.getElementById('status-msg');

    // FUNCIÓN DE VALIDACIÓN EN TIEMPO REAL
    const validarCambios = () => {
        const nName = document.getElementById('res-name').value.trim();
        const nUser = document.getElementById('res-user').value.trim();
        const nEmail = document.getElementById('res-email').value.trim();

        // Buscamos si alguno de los 3 valores choca en la lista de destino
        const conflictoName = listaComparar.some(u => (u.Name || u.nombre || "").toLowerCase() === nName.toLowerCase());
        const conflictoUser = listaComparar.some(u => (u.Username || u.username || "").toLowerCase() === nUser.toLowerCase());
        const conflictoEmail = listaComparar.some(u => (u.Email || u.email || "").toLowerCase() === nEmail.toLowerCase());

        if (conflictoName || conflictoUser || conflictoEmail) {
            btnGuardar.disabled = true;
            btnGuardar.style.opacity = "0.3";
            btnGuardar.style.cursor = "not-allowed";
            msgStatus.innerHTML = "Todavía hay campos que coinciden con usuarios de destino.";
            msgStatus.style.color = "#ef4444";
        } else {
            btnGuardar.disabled = false;
            btnGuardar.style.opacity = "1";
            btnGuardar.style.cursor = "pointer";
            msgStatus.innerHTML = "Datos válidos. Ya no hay conflictos.";
            msgStatus.style.color = "#10b981";
        }
    };

    // Escuchar cambios en los inputs
    inputs.forEach(i => i.oninput = validarCambios);
    validarCambios(); // Ejecutar al cargar por si el default ya choca

    // ACCIONES DE LOS BOTONES
    btnGuardar.onclick = () => {
        usuario.Name = document.getElementById('res-name').value;
        usuario.nombre = document.getElementById('res-name').value;
        usuario.Username = document.getElementById('res-user').value;
        usuario.username = document.getElementById('res-user').value;
        usuario.Email = document.getElementById('res-email').value;
        usuario.email = document.getElementById('res-email').value;
        
        this.dibujar(); // Volver a la pantalla principal
    };

    document.getElementById('cancel-res').onclick = () => this.dibujar();
}

    pantallaAlta() {
        this.base.innerHTML = "";
        let caja = document.createElement('div');
        caja.className = "card";
        caja.style.maxWidth = "500px";
        caja.style.margin = "50px auto";
        caja.innerHTML = `
            <h2>Nuevo Usuario Temporal</h2>
            <form id="form-alta">
                <input type="text" id="add-name" placeholder="Nombre Completo" required style="width:100%; margin-bottom:10px; padding:10px; background:#0a0a0a; color:white; border:1px solid #404040">
                <input type="text" id="add-nick" placeholder="Username" required style="width:100%; margin-bottom:10px; padding:10px; background:#0a0a0a; color:white; border:1px solid #404040">
                <input type="text" id="add-email" placeholder="Email" required style="width:100%; margin-bottom:10px; padding:10px; background:#0a0a0a; color:white; border:1px solid #404040">
                <select id="add-dom" style="width:100%; margin-bottom:20px; padding:10px; background:#0a0a0a; color:white; border:1px solid #404040">
                    <option value="LIDL">Dominio LIDL</option>
                    <option value="MERCADONA">Dominio MERCADONA</option>
                </select>
                <button type="submit" class="cambio" style="width:100%">Añadir a la lista</button>
            </form>
            <button class="btn-mini" style="margin-top:20px; width:100%" id="btn-vol">Volver</button>
        `;
        this.base.appendChild(caja);

        document.getElementById('form-alta').onsubmit = (e) => {
            e.preventDefault();
            const targetDom = document.getElementById('add-dom').value;
            const newUser = {
                Name: document.getElementById('add-name').value,
                Username: document.getElementById('add-nick').value,
                Email: document.getElementById('add-email').value,
                //dominio_origen: targetDom === "LIDL" ? "Lidl" : "Mercadona", // Asignamos el dominio según la selección
                isNew: true
            };
            if (targetDom === "LIDL") this.vLIDL.push(newUser);
            else this.vMERCADONA.push(newUser);
            this.dibujar();
        };
        document.getElementById('btn-vol').onclick = () => this.dibujar();
    }
}

document.addEventListener('DOMContentLoaded', () => new SincroAD());