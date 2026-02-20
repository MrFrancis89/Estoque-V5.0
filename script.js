let audioCtx = null;
let inputCalculadoraAtual = null;
let expressaoCalc = "";

const mapaCategorias = {
    'temperos': ['orégano', 'pimenta', 'canela', 'colorau', 'caldo', 'tempero', 'ervas', 'salsa', 'cebolinha', 'cominho', 'açafrão', 'páprica', 'curry'],
    'limpeza': ['detergente', 'sabão', 'esponja', 'água sanitária', 'desinfetante', 'papel', 'saco', 'lixo', 'bucha', 'álcool', 'limpador', 'multiuso', 'pano', 'vassoura'],
    'carnes': ['carne', 'frango', 'bacon', 'calabresa', 'presunto', 'peixe', 'hamburguer', 'linguiça', 'strogonoff', 'costela', 'bife'],
    'laticinios': ['queijo', 'mussarela', 'cheddar', 'requeijão', 'catupiry', 'leite', 'manteiga', 'iogurte', 'creme de leite', 'parmesão', 'provolone', 'gorgonzola'],
    'hortifruti': ['tomate', 'cebola', 'alho', 'batata', 'banana', 'limão', 'alface', 'rúcula', 'manjericão', 'pimentão', 'cenoura', 'azeitona', 'milho', 'ervilha', 'palmito', 'cogumelo', 'champignon', 'fruta', 'abacaxi', 'uva'],
    'mercearia': ['arroz', 'feijão', 'trigo', 'farinha', 'açúcar', 'sal', 'macarrão', 'óleo', 'azeite', 'fermento', 'fubá', 'molho', 'extrato', 'passata', 'ketchup', 'maionese', 'mostarda', 'chocolate', 'café', 'pão'],
    'bebidas': ['refrigerante', 'coca', 'guaraná', 'suco', 'água', 'cerveja', 'vinho', 'vodka', 'whisky', 'gelo', 'polpa'],
    'embalagens': ['caixa', 'sacola', 'plástico', 'filme', 'alumínio', 'isopor', 'guardanapo', 'canudo', 'copo']
};

const coresCategorias = {
    'carnes': 'var(--cat-carnes)', 'laticinios': 'var(--cat-laticinios)',
    'hortifruti': 'var(--cat-horti)', 'mercearia': 'var(--cat-mercearia)',
    'temperos': 'var(--cat-temperos)', 'limpeza': 'var(--cat-limpeza)',
    'bebidas': 'var(--cat-bebidas)', 'embalagens': 'var(--cat-outros)',
    'outros': 'var(--cat-outros)'
};

const nomesCategorias = {
    'carnes': '🥩 CARNES & FRIOS', 'laticinios': '🧀 LATICÍNIOS',
    'hortifruti': '🥦 HORTIFRUTI', 'mercearia': '🍝 MERCEARIA & GRÃOS',
    'temperos': '🧂 TEMPEROS', 'limpeza': '🧽 LIMPEZA & DESCARTÁVEIS',
    'bebidas': '🥤 BEBIDAS', 'embalagens': '📦 EMBALAGENS',
    'outros': '📦 OUTROS'
};

function identificarCategoria(nomeItem) {
    let nome = nomeItem.toLowerCase();
    const prioridade = ['temperos', 'limpeza', 'bebidas', 'laticinios', 'hortifruti', 'mercearia', 'carnes', 'embalagens'];
    for (let i = 0; i < prioridade.length; i++) {
        let cat = prioridade[i];
        if (mapaCategorias[cat] && mapaCategorias[cat].some(termo => nome.includes(termo))) { return cat; }
    }
    return 'outros';
}

function darFeedback() {
    if (navigator.vibrate) { navigator.vibrate(15); } 
    try {
        if (!audioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; audioCtx = new AudioContext(); }
        if (audioCtx.state === 'suspended') { audioCtx.resume(); }
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.02);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {}
}

let recognition = null;
let isRecording = false;
let activeField = null;

function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false; 
        recognition.interimResults = true; 
        recognition.onstart = function() {
            isRecording = true;
            if (activeField === 'produto') { document.getElementById('btn-mic-prod').classList.add('ouvindo'); document.getElementById('novoProduto').placeholder = "Ouvindo..."; } 
            else if (activeField === 'busca') { document.getElementById('btn-mic-busca').classList.add('ouvindo'); document.getElementById('filtroBusca').placeholder = "Ouvindo..."; }
        };
        recognition.onend = function() {
            isRecording = false;
            document.getElementById('btn-mic-prod').classList.remove('ouvindo');
            document.getElementById('btn-mic-busca').classList.remove('ouvindo');
            document.getElementById('novoProduto').placeholder = "Item";
            document.getElementById('filtroBusca').placeholder = "🔍 Buscar...";
            if(activeField === 'produto') autoPreencherUnidade(); 
            activeField = null;
        };
        recognition.onresult = function(event) {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) { transcript += event.results[i][0].transcript; }
            let textoFinal = transcript.replace(/\.$/, '');
            if (activeField === 'produto') { document.getElementById('novoProduto').value = textoFinal; } 
            else if (activeField === 'busca') { document.getElementById('filtroBusca').value = textoFinal; filtrarGeral(); }
        };
    }
}

function toggleMic(campo, event) { if(event) event.stopPropagation(); darFeedback(); if (!recognition) { mostrarToast("Navegador sem suporte."); return; } if (isRecording) { recognition.stop(); } else { activeField = campo; try { recognition.start(); } catch (e) { recognition.stop(); } } }

window.addEventListener('load', initSpeech);

function toggleSearch(event) {
    if (event) event.stopPropagation(); darFeedback();
    const overlay = document.getElementById('search-overlay'); const btn = document.getElementById('assistive-touch');
    if (overlay.style.display === 'block') { overlay.style.display = 'none'; btn.style.opacity = '0.95'; } 
    else { overlay.style.display = 'block'; overlay.style.top = (window.scrollY + 15) + 'px'; btn.style.opacity = '0'; document.getElementById('filtroBusca').focus(); }
}
document.addEventListener('click', function(event) { const overlay = document.getElementById('search-overlay'); const btn = document.getElementById('assistive-touch'); if ((!overlay.contains(event.target) && !btn.contains(event.target)) && overlay.style.display === 'block') { toggleSearch(null); } });
window.addEventListener('scroll', function() { var overlay = document.getElementById('search-overlay'); if (overlay.style.display === 'block') { overlay.style.top = (window.scrollY + 15) + 'px'; } });

// --- FIX V5.1: TOQUE LONGO SEGURO (NÃO BLOQUEIA TECLADO) ---
let pressTimer;
let isLongPress = false;
const btnLupa = document.getElementById('assistive-touch');

btnLupa.addEventListener('touchstart', (e) => {
    isLongPress = false;
    pressTimer = setTimeout(() => {
        isLongPress = true;
        darFeedback();
        const overlay = document.getElementById('search-overlay');
        if (overlay.style.display !== 'block') { toggleSearch(null); }
        if (!isRecording) { toggleMic('busca', null); }
    }, 600); 
}, {passive: true});

btnLupa.addEventListener('touchend', (e) => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
});

btnLupa.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLongPress) return; // Ignora clique fantasma do Safari se já ativou voz
    toggleSearch(e); // Aciona o toque rápido nativo
});
// ------------------------------------------------------------

let swipeStartX = 0, swipeStartY = 0, swipeCurrentX = 0;
let isSwiping = false, swipedRow = null, justSwiped = false;

function initSwipe() {
    const container = document.getElementById("lista-itens-container"); const swipeBtn = document.getElementById("swipe-bg");
    function getClientX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
    function getClientY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

    container.addEventListener('touchstart', function(e) {
        let tr = e.target.closest('tr'); if (!tr || tr.classList.contains('categoria-header-row')) return;
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') return;
        if (swipedRow && swipedRow !== tr) closeSwipe(swipedRow);
        swipeStartX = getClientX(e); swipeStartY = getClientY(e); isSwiping = false; justSwiped = false;
        swipeCurrentX = (swipedRow === tr) ? -80 : 0; tr.style.transition = 'none';
    }, {passive: true});

    container.addEventListener('touchmove', function(e) {
        let tr = e.target.closest('tr'); if (!tr || tr.classList.contains('categoria-header-row')) return;
        let deltaX = getClientX(e) - swipeStartX; let deltaY = getClientY(e) - swipeStartY;
        if (!isSwiping && Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY)) { isSwiping = true; }
        if (isSwiping) {
            if (e.cancelable) e.preventDefault(); if (document.activeElement) document.activeElement.blur(); justSwiped = true;
            swipeBtn.style.display = 'flex'; swipeBtn.style.top = tr.offsetTop + 'px'; swipeBtn.style.height = tr.offsetHeight + 'px';
            let moveX = swipeCurrentX + deltaX; if (moveX > 0) moveX = 0; if (moveX < -100) moveX = -100; tr.style.transform = `translateX(${moveX}px)`;
        }
    }, {passive: false});

    container.addEventListener('touchend', function(e) {
        let tr = e.target.closest('tr'); if (!tr || tr.classList.contains('categoria-header-row')) return;
        if (isSwiping) {
            let deltaX = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - swipeStartX; let finalX = swipeCurrentX + deltaX;
            tr.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
            if (finalX < -40) {
                tr.style.transform = `translateX(-80px)`; swipedRow = tr;
                swipeBtn.onclick = function() { mostrarConfirmacao("Deseja realmente remover este item?", () => { tr.remove(); salvarDados(); atualizarDropdown(); mostrarToast("Removido 🗑️"); swipeBtn.style.display = 'none'; swipedRow = null; }); };
            } else { closeSwipe(tr); }
            setTimeout(() => { justSwiped = false; }, 300);
        } else { justSwiped = false; }
    });
    document.addEventListener('touchstart', function(e) { if (swipedRow && !swipedRow.contains(e.target) && e.target.id !== 'swipe-bg') { closeSwipe(swipedRow); } }, {passive: true});
}
function closeSwipe(tr) { if (tr) { tr.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'; tr.style.transform = `translateX(0px)`; } setTimeout(() => { if (!swipedRow || swipedRow === tr) { document.getElementById("swipe-bg").style.display = 'none'; if (swipedRow === tr) swipedRow = null; } }, 300); }

function abrirCalculadora(inputElement) { if (justSwiped || swipedRow) return; darFeedback(); inputElement.blur(); inputCalculadoraAtual = inputElement; let tituloCalc = "🧮 Calculadora"; if (inputElement.id === "novoQtd") { let nomeNovo = document.getElementById("novoProduto").value.trim(); tituloCalc = nomeNovo ? "🧮 " + nomeNovo : "🧮 NOVO ITEM"; } else { let linha = inputElement.closest("tr"); if (linha) { let nomeTabela = linha.querySelector(".nome-prod").innerText.trim(); tituloCalc = "🧮 " + nomeTabela; } } document.getElementById("calc-title").innerText = tituloCalc; let val = inputElement.value.replace(',', '.').trim(); expressaoCalc = val || ""; atualizarDisplayCalc(); document.getElementById('modal-calc').style.display = 'flex'; }
function fecharCalculadora() { darFeedback(); document.getElementById('modal-calc').style.display = 'none'; inputCalculadoraAtual = null; }
function calcDigito(digito) { darFeedback(); if (digito === 'C') { expressaoCalc = ""; } else if (digito === 'BACK') { expressaoCalc = expressaoCalc.slice(0, -1); } else { if (digito === ',') digito = '.'; expressaoCalc += digito; } atualizarDisplayCalc(); }
function atualizarDisplayCalc() { let display = document.getElementById('calc-display'); display.innerText = expressaoCalc.replace(/\./g, ',') || "0"; }
function calcSalvar() { darFeedback(); try { let expr = expressaoCalc.replace(/×/g, '*').replace(/÷/g, '/'); expr = expr.replace(/[^0-9+\-*/.]/g, ''); if (expr) { let resultado = Function('"use strict";return (' + expr + ')')(); if (!isFinite(resultado)) throw new Error("Erro"); resultado = Math.round(resultado * 100) / 100; inputCalculadoraAtual.value = resultado.toString().replace('.', ','); } else { inputCalculadoraAtual.value = ""; } salvarDados(); fecharCalculadora(); mostrarToast("Quantidade Salva ✅"); } catch (e) { document.getElementById('calc-display').innerText = "Erro"; setTimeout(atualizarDisplayCalc, 1000); } }

function limparCampo(idCaixaTexto) { darFeedback(); document.getElementById(idCaixaTexto).value = ''; document.getElementById(idCaixaTexto).focus(); if (idCaixaTexto === 'filtroBusca') { filtrarGeral(); } }
function alternarLista() { darFeedback(); var tabelaWrapper = document.querySelector(".table-wrapper"); var btnToggle = document.getElementById("btn-toggle-lista"); if (tabelaWrapper.style.display === "none") { tabelaWrapper.style.display = "block"; btnToggle.innerHTML = "🔽 Ocultar Lista de Estoque"; } else { tabelaWrapper.style.display = "none"; btnToggle.innerHTML = "▶️ Mostrar Lista de Estoque"; } }
function alternarTema() { darFeedback(); document.body.classList.toggle('light-mode'); localStorage.setItem('temaEstoque', document.body.classList.contains('light-mode') ? 'claro' : 'escuro'); }

let acaoConfirmacao = null;
function mostrarToast(msg) { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = msg; container.appendChild(toast); setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000); }
function mostrarConfirmacao(msg, callback, tipoBotao = 'perigo') { darFeedback(); document.getElementById('modal-text').innerText = msg; const btnCancel = document.getElementById('modal-btn-cancel'); const btnConfirm = document.getElementById('modal-btn-confirm'); btnCancel.style.display = 'block'; btnCancel.innerText = 'Cancelar'; btnConfirm.style.display = 'block'; btnConfirm.innerText = 'Confirmar'; btnConfirm.style.backgroundColor = (tipoBotao === 'sucesso') ? 'var(--btn-green)' : 'var(--btn-red)'; document.getElementById('modal-confirm').style.display = 'flex'; acaoConfirmacao = callback; }
function mostrarAlertaElegante(msg) { darFeedback(); document.getElementById('modal-text').innerText = msg; const btnCancel = document.getElementById('modal-btn-cancel'); const btnConfirm = document.getElementById('modal-btn-confirm'); btnCancel.style.display = 'none'; btnConfirm.style.display = 'block'; btnConfirm.innerText = 'OK'; btnConfirm.style.backgroundColor = 'var(--btn-blue)'; document.getElementById('modal-confirm').style.display = 'flex'; acaoConfirmacao = null; }
function fecharModal() { document.getElementById('modal-confirm').style.display = 'none'; acaoConfirmacao = null; }
document.getElementById('modal-btn-confirm').addEventListener('click', () => { darFeedback(); if(acaoConfirmacao) acaoConfirmacao(); fecharModal(); });

function obterDataAtual() { return new Date().toLocaleDateString('pt-BR'); }
function obterDataAmanha() { let hoje = new Date(); let amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1); return amanha.toLocaleDateString('pt-BR'); }

function atualizarTitulos() { 
    document.getElementById("titulo-pagina").innerHTML = `<span class="titulo-estoque" style="font-weight: 400; letter-spacing: 1px; color: #cccccc;">ESTOQUE</span> <span style="color: var(--btn-danger); font-weight: 900; margin-left: 4px;">V5.0</span>`; 
    document.getElementById("titulo-compras").innerText = "LISTA " + obterDataAmanha(); 
}

var storageKey = "estoqueDados_v4_categorias"; var storageOcultos = "itensOcultosPadrao_v4"; var storageMeus = "meusItensPadrao_v4";

var containerItens = document.getElementById("lista-itens-container"); var selectFiltro = document.getElementById("filtroSelect"); var buscaInput = document.getElementById("filtroBusca"); var areaCompras = document.getElementById("area-compras"); var ulCompras = document.getElementById("lista-compras-visual");

function carregarListaPadrao() { var listaCombinada = []; var ocultosSistema = JSON.parse(localStorage.getItem(storageOcultos) || "[]"); produtosPadrao.forEach(p => { var d = p.split("|"); if (!ocultosSistema.includes(d[0].toLowerCase())) { listaCombinada.push({ n: d[0], q: "", u: d[1], c: false }); } }); var favoritosUsuario = JSON.parse(localStorage.getItem(storageMeus) || "[]"); favoritosUsuario.forEach(item => { if(!listaCombinada.some(i => i.n.toLowerCase() === item.n.toLowerCase())) { listaCombinada.push({ n: item.n, q: "", u: item.u, c: false }); } }); renderizarListaCompleta(listaCombinada); }
function iniciarApp() { if(localStorage.getItem('temaEstoque') === 'claro') { document.body.classList.add('light-mode'); } atualizarTitulos(); var salvos = localStorage.getItem(storageKey); if (salvos && JSON.parse(salvos).length > 0) { renderizarListaCompleta(JSON.parse(salvos)); } else { carregarListaPadrao(); } atualizarDropdown(); atualizarPainelCompras(); initSwipe(); }

function renderizarListaCompleta(dados) { containerItens.innerHTML = ""; dados.sort((a, b) => a.n.localeCompare(b.n)); let grupos = { 'carnes': [], 'laticinios': [], 'hortifruti': [], 'mercearia': [], 'temperos': [], 'limpeza': [], 'bebidas': [], 'embalagens': [], 'outros': [] }; dados.forEach(item => { let cat = identificarCategoria(item.n); grupos[cat].push(item); }); for (let cat in grupos) { if (grupos[cat].length > 0) { let trHeader = document.createElement("tr"); trHeader.classList.add("categoria-header-row"); trHeader.innerHTML = `<td colspan="4" class="categoria-header" style="background-color: ${coresCategorias[cat]}">${nomesCategorias[cat]}</td>`; containerItens.appendChild(trHeader); grupos[cat].forEach(item => { inserirLinhaNoDOM(item.n, item.q, item.u, item.c); }); } } }
function inserirLinhaNoDOM(n, q, u, chk) { var tr = document.createElement("tr"); if(chk) tr.classList.add("linha-marcada"); tr.innerHTML = `<td class="col-check"><input type="checkbox" onchange="alternarCheck(this)" ${chk ? 'checked' : ''}></td><td class="col-desc"><span contenteditable="true" class="nome-prod" onblur="salvarEAtualizar()">${n}</span></td><td class="col-qtd"><input type="text" class="input-qtd-tabela" value="${q}" onclick="abrirCalculadora(this)" readonly></td><td class="col-unid"><select class="select-tabela" onchange="salvarDados()"><option value="kg" ${u==='kg'?'selected':''}>kg</option><option value="g" ${u==='g'?'selected':''}>g</option><option value="uni" ${u==='uni'?'selected':''}>uni</option><option value="pct" ${u==='pct'?'selected':''}>pct</option><option value="cx" ${u==='cx'?'selected':''}>cx</option><option value="bld" ${u==='bld'?'selected':''}>bld</option><option value="crt" ${u==='crt'?'selected':''}>crt</option></select></td>`; containerItens.appendChild(tr); }

function salvarDados() { var dados = []; document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { var c = r.querySelectorAll("td"); if (c.length > 0) { dados.push({ n: c[1].innerText.replace(/(\r\n|\n|\r)/gm, " ").trim(), q: c[2].querySelector("input").value.trim(), u: c[3].querySelector("select").value, c: c[0].querySelector("input[type='checkbox']").checked }); } }); localStorage.setItem(storageKey, JSON.stringify(dados)); var s = document.getElementById("status-save"); s.style.opacity = "1"; setTimeout(() => s.style.opacity = "0", 1500); atualizarPainelCompras(); }
function salvarEAtualizar() { salvarDados(); var dados = JSON.parse(localStorage.getItem(storageKey)); renderizarListaCompleta(dados); atualizarDropdown(); }
function alternarTodos(masterBox) { darFeedback(); let isChecked = masterBox.checked; document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { if (r.style.display !== "none") { let box = r.querySelector("input[type='checkbox']"); box.checked = isChecked; if (isChecked) { r.classList.add("linha-marcada"); } else { r.classList.remove("linha-marcada"); } } }); salvarDados(); }
function alternarCheck(box) { darFeedback(); var linha = box.parentElement.parentElement; if(box.checked) { linha.classList.add("linha-marcada"); } else { linha.classList.remove("linha-marcada"); document.getElementById('check-todos').checked = false; } salvarDados(); }
function atualizarPainelCompras() { ulCompras.innerHTML = ""; var temItens = false; document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { var checkbox = r.querySelector("input[type='checkbox']"); if (checkbox && checkbox.checked) { temItens = true; var li = document.createElement("li"); li.innerText = r.querySelector(".nome-prod").innerText.replace(/(\r\n|\n|\r)/gm, " ").trim(); ulCompras.appendChild(li); } }); areaCompras.style.display = temItens ? "block" : "none"; }

function gerarTextoEstoque() {
    let t = "*ESTOQUE " + obterDataAtual() + "*\n\n";
    let itens = [];
    document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
        let cols = r.querySelectorAll("td");
        let nome = cols[1].innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
        let qTxt = cols[2].querySelector("input").value.trim();
        let unidade = cols[3].querySelector("select").options[cols[3].querySelector("select").selectedIndex].text;
        if(qTxt !== "") { itens.push(`${nome}: ${qTxt} ${unidade}`); } 
        else { itens.push(`${nome}:   ${unidade}`); }
    });
    itens.sort();
    itens.forEach(i => t += `${i}\n`);
    return t;
}

function gerarTextoCompras() {
    let t = "*LISTA DE COMPRAS " + obterDataAmanha() + "*\n\n";
    let itens = [];
    document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => {
        var check = r.querySelector("input[type='checkbox']");
        if (check && check.checked) {
            itens.push(r.querySelector(".nome-prod").innerText.replace(/(\r\n|\n|\r)/gm, " ").trim());
        }
    });
    itens.sort();
    itens.forEach(i => t += `${i}\n`);
    return t;
}

function copiarCompras() { copiarParaClipboard(gerarTextoCompras()); } function compartilharComprasZap() { window.open("https://wa.me/?text=" + encodeURIComponent(gerarTextoCompras()), '_blank'); }
function copiarEstoque() { copiarParaClipboard(gerarTextoEstoque()); } function compartilharEstoque() { window.open("https://wa.me/?text=" + encodeURIComponent(gerarTextoEstoque()), '_blank'); }

function copiarParaClipboard(texto) { darFeedback(); if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(texto).then(() => mostrarToast("Copiado com sucesso! ✅")).catch(() => copiarFallback(texto)); } else { copiarFallback(texto); } }
function copiarFallback(texto) { var textArea = document.createElement("textarea"); textArea.value = texto; textArea.style.position = "fixed"; textArea.style.left = "-9999px"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); mostrarToast("Copiado com sucesso! ✅"); } catch (err) { mostrarAlertaElegante("Erro ao copiar."); } document.body.removeChild(textArea); }

// --- FIX V5.1: TRAVA DE SEGURANÇA PARA NÃO APAGAR A LISTA PADRÃO ---
function adicionarManual(salvarNoPadrao) { 
    var p = document.getElementById("novoProduto").value.trim(); 
    var q = document.getElementById("novoQtd").value.trim(); 
    var u = document.getElementById("novoUnidade").value; 
    
    if (!p) { mostrarToast("⚠️ Digite o nome do produto!"); return; } 
    darFeedback(); 
    
    salvarDados(); // FIX: Salva a tela atual ANTES de injetar, preservando a lista padrão
    
    var dados = JSON.parse(localStorage.getItem(storageKey) || "[]"); 
    
    if (dados.some(item => item.n.toLowerCase() === p.toLowerCase())) {
        mostrarToast("⚠️ O item já existe na lista!");
        return;
    }

    dados.push({ n: p, q: q, u: u, c: false }); 
    renderizarListaCompleta(dados); 
    salvarDados(); 
    
    if(salvarNoPadrao) { 
        var favoritosUsuario = JSON.parse(localStorage.getItem(storageMeus) || "[]"); 
        if(!favoritosUsuario.some(item => item.n.toLowerCase() === p.toLowerCase())) { 
            favoritosUsuario.push({ n: p, u: u }); 
            localStorage.setItem(storageMeus, JSON.stringify(favoritosUsuario)); 
            mostrarToast("Item FIXADO! ⭐"); 
        } 
    } 
    document.getElementById("novoProduto").value = ""; 
    document.getElementById("novoQtd").value = ""; 
}
// ------------------------------------------------------------------

function removerDoPadrao() { var p = document.getElementById("novoProduto").value.trim(); if (!p) { mostrarToast("⚠️ Digite o nome para remover!"); return; } darFeedback(); var favoritosUsuario = JSON.parse(localStorage.getItem(storageMeus) || "[]"); var novaListaFavoritos = favoritosUsuario.filter(item => item.n.toLowerCase() !== p.toLowerCase()); localStorage.setItem(storageMeus, JSON.stringify(novaListaFavoritos)); var ocultosSistema = JSON.parse(localStorage.getItem(storageOcultos) || "[]"); if (!ocultosSistema.includes(p.toLowerCase())) { ocultosSistema.push(p.toLowerCase()); localStorage.setItem(storageOcultos, JSON.stringify(ocultosSistema)); } document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { var nomeTabela = r.querySelector(".nome-prod").innerText.toLowerCase(); if(nomeTabela === p.toLowerCase()) { r.remove(); } }); salvarDados(); atualizarDropdown(); document.getElementById("novoProduto").value = ""; document.getElementById("novoQtd").value = ""; }

function filtrarGeral() { var tBusca = buscaInput.value.toLowerCase(); var tSelect = selectFiltro.value.toLowerCase(); document.querySelectorAll("#lista-itens-container tr:not(.categoria-header-row)").forEach(r => { var nome = r.querySelector(".nome-prod").innerText.toLowerCase(); if (nome.includes(tBusca) && (tSelect === "" || nome === tSelect)) { r.style.display = ""; } else { r.style.display = "none"; } }); let headers = document.querySelectorAll(".categoria-header-row"); headers.forEach(header => { let proximoElem = header.nextElementSibling; let temItemVisivel = false; while(proximoElem && !proximoElem.classList.contains("categoria-header-row")) { if (proximoElem.style.display !== "none") { temItemVisivel = true; break; } proximoElem = proximoElem.nextElementSibling; } header.style.display = temItemVisivel ? "" : "none"; }); }
function atualizarDropdown() { var v = selectFiltro.value; selectFiltro.innerHTML = '<option value="">📂 ITENS</option>'; var nomes = []; document.querySelectorAll(".nome-prod").forEach(td => nomes.push(td.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim())); nomes.sort().forEach(n => { var o = document.createElement("option"); o.value = n; o.text = n; selectFiltro.add(o); }); selectFiltro.value = v; }

function resetarTudo() { mostrarConfirmacao("ATENÇÃO: Restaurar lista de fábrica?", () => { localStorage.removeItem(storageKey); localStorage.removeItem(storageOcultos); location.reload(); }); }
function iniciarNovoDia() { mostrarConfirmacao("ZERAR QUANTIDADES?", () => { var dados = JSON.parse(localStorage.getItem(storageKey) || "[]"); dados.forEach(item => { item.q = ""; item.c = false; }); localStorage.setItem(storageKey, JSON.stringify(dados)); location.reload(); }, 'sucesso'); }
function salvarListaNoCelular() { var dados = localStorage.getItem(storageKey); if (!dados || dados === "[]") return; darFeedback(); var blob = new Blob([dados], { type: "application/json" }); var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = "ESTOQUE_CATEGORIAS.json"; a.click(); }
function carregarListaDoCelular(event) { var f = event.target.files[0]; var r = new FileReader(); r.onload = function(e) { localStorage.setItem(storageKey, e.target.result); location.reload(); }; r.readAsText(f); }
function autoPreencherUnidade() { var inputNome = document.getElementById("novoProduto").value.toLowerCase().trim(); var match = produtosPadrao.find(p => p.split("|")[0].toLowerCase().startsWith(inputNome)); if (match) { document.getElementById("novoUnidade").value = match.split("|")[1]; } }

iniciarApp();
