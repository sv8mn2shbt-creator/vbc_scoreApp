const POS_LABELS = [1, 6, 5, 4, 3, 2];

let state = {
    scoreA: 0, scoreB: 0,
    setA: 0, setB: 0,
    setRecords: [],
    servingTeam: null,
    playersA: ["A1", "A6", "A5", "A4", "A3", "A2"],
    playersB: ["B1", "B6", "B5", "B4", "B3", "B2"],
    history: [],
    selectedPlayersA: [],
    selectedPlayersB: []
};

function init() {
    setupNameInputs();
    render();
}

function setInitialServer(team) {
    state.servingTeam = team;
    const selector = document.getElementById('serve-selector');
    if (selector) selector.style.display = 'none';
    render();
}

function setupNameInputs() {
    ['a', 'b'].forEach(id => {
        const container = document.getElementById(`inputs-${id}`);
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'name-edit-input';
            input.value = (id === 'a') ? state.playersA[i] : state.playersB[i];
            input.oninput = (e) => {
                if (id === 'a') state.playersA[i] = e.target.value;
                else state.playersB[i] = e.target.value;
                render(); 
            };
            container.appendChild(input);
        }
    });
}

function render() {
    document.getElementById('display-score-a').textContent = state.scoreA;
    document.getElementById('display-score-b').textContent = state.scoreB;
    document.getElementById('set-count-a').textContent = state.setA;
    document.getElementById('set-count-b').textContent = state.setB;
    
    const namesA = state.selectedPlayersA.length > 0 
        ? state.selectedPlayersA.map(idx => state.playersA[idx]).join(', ') : "なし";
    const namesB = state.selectedPlayersB.length > 0 
        ? state.selectedPlayersB.map(idx => state.playersB[idx]).join(', ') : "なし";
    
    document.getElementById('selected-player-display-a').textContent = `選択: ${namesA}`;
    document.getElementById('selected-player-display-b').textContent = `選択: ${namesB}`;

    const indA = document.getElementById('indicatorA');
    const indB = document.getElementById('indicatorB');
    if (indA && indB) {
        indA.classList.toggle('active', state.servingTeam === 'A');
        indB.classList.toggle('active', state.servingTeam === 'B');
    }

    const isStarted = state.servingTeam !== null;
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
    while (grid.firstChild) { grid.removeChild(grid.firstChild); }

    let visualOrder = (id === 'a') ? [2, 3, 1, 4, 0, 5] : [5, 0, 4, 1, 3, 2];
    const selectedList = (id === 'a') ? state.selectedPlayersA : state.selectedPlayersB;
    const fragment = document.createDocumentFragment();

    visualOrder.forEach((idx) => {
        const box = document.createElement('div');
        box.className = 'player-box';
        if (selectedList.includes(idx)) box.classList.add('selected');
        if (state.servingTeam === id.toUpperCase() && idx === 0) box.classList.add('server-highlight');
        box.onclick = () => selectPlayer(id, idx);
        box.innerHTML = `<span class="pos-tag">P${POS_LABELS[idx]}</span><div class="p-name-display">${players[idx]}</div>`;
        fragment.appendChild(box);
    });
    grid.appendChild(fragment);
}

function selectPlayer(team, idx) {
    let list = (team === 'a') ? state.selectedPlayersA : state.selectedPlayersB;
    const foundIdx = list.indexOf(idx);
    if (foundIdx > -1) list.splice(foundIdx, 1);
    else list.push(idx);
    render();
}

function addPoint(winner, reason) {
    if (!state.servingTeam) return;

    const currentServerName = state.servingTeam === 'A' ? state.playersA[0] : state.playersB[0];
    let actorNames = [];
    const isLossButton = (reason.includes('ミス') && !reason.includes('相手'));
    const pressedTeam = isLossButton ? (winner === 'A' ? 'B' : 'A') : winner;

    if (pressedTeam === 'A') {
        actorNames = state.selectedPlayersA.length > 0 ? state.selectedPlayersA.map(idx => state.playersA[idx]) : (reason.includes('サーブ') ? [state.playersA[0]] : []);
    } else {
        actorNames = state.selectedPlayersB.length > 0 ? state.selectedPlayersB.map(idx => state.playersB[idx]) : (reason.includes('サーブ') ? [state.playersB[0]] : []);
    }

    const prevStateSnap = {
        scoreA: state.scoreA, scoreB: state.scoreB, setA: state.setA, setB: state.setB,
        servingTeam: state.servingTeam, playersA: [...state.playersA], playersB: [...state.playersB]
    };

    const isSideOut = (state.servingTeam !== winner);
    if (winner === 'A') {
        state.scoreA++;
        if (isSideOut) { state.servingTeam = 'A'; rotate('A'); }
    } else {
        state.scoreB++;
        if (isSideOut) { state.servingTeam = 'B'; rotate('B'); }
    }

    state.history.push({
        score: `${state.scoreA}-${state.scoreB}`, team: winner, reason: reason,
        actor: actorNames.length > 0 ? actorNames.join('/') : "-", server: currentServerName, snap: prevStateSnap
    });

    state.selectedPlayersA = []; state.selectedPlayersB = [];
    render();
    setTimeout(checkSetEnd, 10);
}

function rotate(team) {
    const p = (team === 'A') ? state.playersA : state.playersB;
    if (p.length > 0) p.unshift(p.pop());
}

function checkSetEnd() {
    const a = state.scoreA; const b = state.scoreB;
    const limit = (state.setA + state.setB === 2) ? 15 : 25;

    if ((a >= limit || b >= limit) && Math.abs(a - b) >= 2) {
        const setWinner = a > b ? 'A' : 'B';
        alert(`TEAM ${setWinner} が第 ${state.setA + state.setB + 1} セットを獲得！`);
        state.setRecords.push(`${a}-${b}`);
        if (setWinner === 'A') state.setA++; else state.setB++;

        if (state.setA === 2 || state.setB === 2) {
            alert(`試合終了！ TEAM ${state.setA === 2 ? 'A' : 'B'} の勝利です！`);
            state.servingTeam = null; render(); return;
        }

        state.scoreA = 0; state.scoreB = 0; state.servingTeam = null;
        document.getElementById('serve-selector').style.display = 'block';
        render();
    }
}

function undo() {
    if (state.history.length === 0) return;
    if (confirm("1点戻しますか？")) {
        const last = state.history.pop();
        const prev = last.snap;
        state.scoreA = prev.scoreA; state.scoreB = prev.scoreB;
        state.setA = prev.setA; state.setB = prev.setB;
        state.servingTeam = prev.servingTeam;
        state.playersA = [...prev.playersA]; state.playersB = [...prev.playersB];
        if (state.servingTeam === null) document.getElementById('serve-selector').style.display = 'block';
        render();
    }
}

function exportCSV() {
    const teamA = document.getElementById('team-name-a').value || "Team A";
    const teamB = document.getElementById('team-name-b').value || "Team B";
    let csv = "\uFEFFスコア,得点チーム,サーバー,担当選手,理由\n";
    state.history.forEach(h => {
        csv += `${h.score},${h.team === 'A' ? teamA : teamB},${h.server},${h.actor},${h.reason}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `結果_${teamA}_vs_${teamB}.csv`;
    a.click();
}

function saveData() {
    localStorage.setItem('vb_score_state', JSON.stringify(state));
    alert("保存しました");
}

function loadData() {
    const saved = localStorage.getItem('vb_score_state');
    if (saved) {
        Object.assign(state, JSON.parse(saved));
        if (state.servingTeam) document.getElementById('serve-selector').style.display = 'none';
        render();
        alert("読み込みました");
    }
}

function resetGame() { if(confirm("リセットしますか？")) location.reload(); }

init();