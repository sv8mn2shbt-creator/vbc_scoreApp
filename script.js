const POS_LABELS = [1, 6, 5, 4, 3, 2];
let state = {
    scoreA: 0, scoreB: 0, setA: 0, setB: 0, setRecords: [],
    servingTeam: null,
    playersA: ["A1", "A6", "A5", "A4", "A3", "A2"],
    playersB: ["B1", "B6", "B5", "B4", "B3", "B2"],
    history: [], selectedPlayersA: [], selectedPlayersB: []
};

function init() { setupNameInputs(); render(); }

function setInitialServer(team) {
    state.servingTeam = team;
    render();
}

function setupNameInputs() {
    ['a', 'b'].forEach(id => {
        const container = document.getElementById(`inputs-${id}`);
        if (!container) return;
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 6; i++) {
            const input = document.createElement('input');
            input.className = 'name-edit-input';
            input.value = (id === 'a') ? state.playersA[i] : state.playersB[i];
            input.oninput = (e) => {
                const val = e.target.value;
                if (id === 'a') state.playersA[i] = val;
                else state.playersB[i] = val;
                updateNamesOnly(); 
            };
            fragment.appendChild(input);
        }
        container.appendChild(fragment);
    });
}

function updateNamesOnly() {
    ['a', 'b'].forEach(id => {
        const players = (id === 'a') ? state.playersA : state.playersB;
        const grid = document.getElementById(`grid-${id}`);
        if (!grid) return;
        const boxes = grid.querySelectorAll('.player-box');
        let visualOrder = (id === 'a') ? [2, 3, 1, 4, 0, 5] : [5, 0, 4, 1, 3, 2];
        visualOrder.forEach((playerIdx, i) => {
            if (boxes[i]) {
                const nameDisplay = boxes[i].querySelector('.p-name-display');
                if (nameDisplay) nameDisplay.textContent = players[playerIdx];
            }
        });
    });
}

function render() {
    document.getElementById('display-score-a').innerText = state.scoreA;
    document.getElementById('display-score-b').innerText = state.scoreB;
    document.getElementById('set-count-a').innerText = state.setA;
    document.getElementById('set-count-b').innerText = state.setB;
    
    document.getElementById('selected-player-display-a').innerText = "選択: " + (state.selectedPlayersA.length > 0 ? state.selectedPlayersA.map(i => state.playersA[i]).join(',') : "なし");
    document.getElementById('selected-player-display-b').innerText = "選択: " + (state.selectedPlayersB.length > 0 ? state.selectedPlayersB.map(i => state.playersB[i]).join(',') : "なし");

    document.getElementById('indicatorA').classList.toggle('active', state.servingTeam === 'A');
    document.getElementById('indicatorB').classList.toggle('active', state.servingTeam === 'B');

    const isStarted = state.servingTeam !== null;
    document.getElementById('serve-selector').style.display = isStarted ? 'none' : 'flex';

    const isAServing = (state.servingTeam === 'A');
    const isBServing = (state.servingTeam === 'B');
    const isP2toP6SelectedA = state.selectedPlayersA.some(idx => idx !== 0);
    const isP2toP6SelectedB = state.selectedPlayersB.some(idx => idx !== 0);

    document.getElementById('btn-serve-win-a').disabled = !isAServing || isP2toP6SelectedA;
    document.getElementById('btn-serve-err-a').disabled = !isAServing || isP2toP6SelectedA;
    document.getElementById('btn-serve-win-b').disabled = !isBServing || isP2toP6SelectedB;
    document.getElementById('btn-serve-err-b').disabled = !isBServing || isP2toP6SelectedB;

    document.querySelectorAll('.button-section button:not([id*="serve"])').forEach(btn => btn.disabled = !isStarted);

    drawSide('a', state.playersA);
    drawSide('b', state.playersB);
}

function drawSide(id, players) {
    const grid = document.getElementById(`grid-${id}`);
    if (!grid) return;
    const selectedList = (id === 'a') ? state.selectedPlayersA : state.selectedPlayersB;
    let visualOrder = (id === 'a') ? [2, 3, 1, 4, 0, 5] : [5, 0, 4, 1, 3, 2];

    if (grid.children.length === 0) {
        const fragment = document.createDocumentFragment();
        visualOrder.forEach((idx) => {
            const box = document.createElement('div');
            box.className = 'player-box';
            box.onclick = () => {
                let list = (id === 'a') ? state.selectedPlayersA : state.selectedPlayersB;
                const fIdx = list.indexOf(idx);
                if (fIdx > -1) list.splice(fIdx, 1); else list.push(idx);
                render();
            };
            box.innerHTML = `<span class="pos-tag">P${POS_LABELS[idx]}</span><div class="p-name-display">${players[idx]}</div>`;
            fragment.appendChild(box);
        });
        grid.appendChild(fragment);
    } 
    
    const boxes = grid.children;
    visualOrder.forEach((playerIdx, i) => {
        const box = boxes[i];
        if (box) {
            box.classList.toggle('selected', selectedList.includes(playerIdx));
            box.classList.toggle('server-highlight', state.servingTeam === id.toUpperCase() && playerIdx === 0);
            const nameDisplay = box.querySelector('.p-name-display');
            if (nameDisplay) nameDisplay.textContent = players[playerIdx];
        }
    });
}

function addPoint(winner, reason) {
    if (!state.servingTeam) return;
    const currentServer = state.servingTeam === 'A' ? state.playersA[0] : state.playersB[0];
    
    // 【メモリ最適化】履歴(history)を含まないスナップショットを作成
    const snap = {
        scoreA: state.scoreA, scoreB: state.scoreB,
        setA: state.setA, setB: state.setB,
        servingTeam: state.servingTeam,
        playersA: [...state.playersA], playersB: [...state.playersB]
    };

    let actor = "-";
    const isLoss = (reason.includes('ミス') && !reason.includes('相手'));
    const pTeam = isLoss ? (winner === 'A' ? 'B' : 'A') : winner;
    const pList = pTeam === 'A' ? state.selectedPlayersA : state.selectedPlayersB;
    const pNames = pTeam === 'A' ? state.playersA : state.playersB;
    
    if (pList.length > 0) actor = pList.map(i => pNames[i]).join('/');
    else if (reason.includes('サーブ')) actor = pNames[0];

    const isSideOut = (state.servingTeam !== winner);
    if (winner === 'A') { state.scoreA++; if(isSideOut){ state.servingTeam='A'; rotate('A'); } }
    else { state.scoreB++; if(isSideOut){ state.servingTeam='B'; rotate('B'); } }

    state.history.push({ 
        score: `${state.scoreA}-${state.scoreB}`, 
        team: winner, 
        reason: reason, 
        actor: actor, 
        server: currentServer, 
        snap: snap 
    });

    state.selectedPlayersA = []; state.selectedPlayersB = [];
    render();
    setTimeout(checkSetEnd, 10);
}

function rotate(t) { const p = (t === 'A') ? state.playersA : state.playersB; p.unshift(p.pop()); }

function checkSetEnd() {
    const a = state.scoreA, b = state.scoreB;
    const limit = (state.setA + state.setB === 2) ? 15 : 25;
    if ((a >= limit || b >= limit) && Math.abs(a - b) >= 2) {
        const win = a > b ? 'A' : 'B';
        alert(`セット終了: TEAM ${win}`);
        state.setRecords.push(`${a}-${b}`);
        if (win === 'A') state.setA++; else state.setB++;
        if (state.setA === 2 || state.setB === 2) { alert("試合終了！"); state.servingTeam = null; }
        else { state.scoreA = 0; state.scoreB = 0; state.servingTeam = null; }
        render();
    }
}

function undo() {
    if (state.history.length === 0) return;
    if (confirm("戻しますか？")) {
        const last = state.history.pop();
        const s = last.snap;
        // 履歴以外の状態を復元
        state.scoreA = s.scoreA; state.scoreB = s.scoreB;
        state.setA = s.setA; state.setB = s.setB;
        state.servingTeam = s.servingTeam;
        state.playersA = [...s.playersA]; state.playersB = [...s.playersB];
        render();
    }
}

function exportCSV() {
    let csv = "\uFEFFスコア,得点チーム,サーバー,担当,理由\n";
    state.history.forEach(h => csv += `${h.score},${h.team},${h.server},${h.actor},${h.reason}\n`);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = "result.csv"; a.click();
}

function saveData() { 
    // 保存時もhistoryを除外するか検討が必要だが、一旦すべて保存
    localStorage.setItem('vb_v3', JSON.stringify(state)); 
    alert("保存しました"); 
}

function loadData() { 
    const s = localStorage.getItem('vb_v3'); 
    if(s){ 
        const loaded = JSON.parse(s);
        Object.assign(state, loaded); 
        render(); 
    } 
}

function resetGame() { if(confirm("リセット？")) location.reload(); }

init();