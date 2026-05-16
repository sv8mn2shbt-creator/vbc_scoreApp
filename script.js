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

/**
 * 描画処理の最適化
 * innerHTMLを使いつつ、不要なイベントの重複を防ぐ
 */
function render() {
    // スコア表示
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

    // サーブ系ボタンの制御
    document.getElementById('btn-serve-win-a').disabled = !isAServing || isP2toP6SelectedA;
    document.getElementById('btn-serve-err-a').disabled = !isAServing || isP2toP6SelectedA;
    document.getElementById('btn-serve-win-b').disabled = !isBServing || isP2toP6SelectedB;
    document.getElementById('btn-serve-err-b').disabled = !isBServing || isP2toP6SelectedB;

    const otherButtons = document.querySelectorAll('.button-section button:not([id*="serve"])');
    otherButtons.forEach(btn => btn.disabled = !isStarted);

    // コート描画
    drawSide('a', state.playersA);
    drawSide('b', state.playersB);
}

function drawSide(id, players) {
    const grid = document.getElementById(`grid-${id}`);
    if (!grid) return;
    
    // 軽量化：一度全ての要素を削除（GCを促す）
    while (grid.firstChild) { grid.removeChild(grid.firstChild); }

    let visualOrder = (id === 'a') ? [2, 3, 1, 4, 0, 5] : [5, 0, 4, 1, 3, 2];
    const selectedList = (id === 'a') ? state.selectedPlayersA : state.selectedPlayersB;

    // ドキュメントフラグメントを使用してDOM操作の負荷を軽減
    const fragment = document.createDocumentFragment();

    visualOrder.forEach((idx) => {
        const box = document.createElement('div');
        box.className = 'player-box';
        
        if (selectedList.includes(idx)) box.classList.add('selected');
        if (state.servingTeam === id.toUpperCase() && idx === 0) box.classList.add('server-highlight');

        // イベントリスナーの直接指定（メモリリーク防止）
        box.onclick = () => selectPlayer(id, idx);
        
        box.innerHTML = `
            <span class="pos-tag">P${POS_LABELS[idx]}</span>
            <div class="p-name-display">${players[idx]}</div>
        `;
        fragment.appendChild(box);
    });
    grid.appendChild(fragment);
}

function selectPlayer(team, idx) {
    let list = (team === 'a') ? state.selectedPlayersA : state.selectedPlayersB;
    const foundIdx = list.indexOf(idx);
    if (foundIdx > -1) {
        list.splice(foundIdx, 1);
    } else {
        list.push(idx);
    }
    render();
}

function addPoint(winner, reason) {
    if (!state.servingTeam) return;

    let actorNames = [];
    const isLossButton = (reason.includes('ミス') && !reason.includes('相手'));
    const pressedTeam = isLossButton ? (winner === 'A' ? 'B' : 'A') : winner;

    if (pressedTeam === 'A') {
        actorNames = state.selectedPlayersA.length > 0 ? state.selectedPlayersA.map(idx => state.playersA[idx]) : (reason.includes('サーブ') ? [state.playersA[0]] : []);
    } else {
        actorNames = state.selectedPlayersB.length > 0 ? state.selectedPlayersB.map(idx => state.playersB[idx]) : (reason.includes('サーブ') ? [state.playersB[0]] : []);
    }

    const actorDisplay = actorNames.length > 0 ? actorNames.join('/') : "-";

    // 【軽量化】重いJSON.stringifyを避け、必要な値だけをコピー
    const prevStateSnap = {
        scoreA: state.scoreA, scoreB: state.scoreB,
        setA: state.setA, setB: state.setB,
        servingTeam: state.servingTeam,
        playersA: [...state.playersA],
        playersB: [...state.playersB]
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
        score: `${state.scoreA}-${state.scoreB}`,
        team: winner,
        reason: reason,
        actor: actorDisplay,
        snap: prevStateSnap
    });

    state.selectedPlayersA = [];
    state.selectedPlayersB = [];
    render();

    setTimeout(checkSetEnd, 10);
}

function rotate(team) {
    const p = (team === 'A') ? state.playersA : state.playersB;
    if (p.length > 0) p.unshift(p.pop());
}

/**
 * セット終了および試合終了（2セット先取）の判定
 */
function checkSetEnd() {
    const a = state.scoreA;
    const b = state.scoreB;
    
    // 現在の合計セット数から、このセットが何セット目か判定
    // 0 or 1セット終了済みなら次は25点、2セット終了済み（ファイナルセット）なら15点
    const isFinalSet = (state.setA + state.setB === 2);
    const limit = isFinalSet ? 15 : 25;

    // セット終了条件：上限点に達し、かつ2点差以上
    if ((a >= limit || b >= limit) && Math.abs(a - b) >= 2) {
        const setWinner = a > b ? 'A' : 'B';
        alert(`TEAM ${setWinner} が第 ${state.setA + state.setB + 1} セットを獲得しました！`);
        
        // セット記録を保存
        state.setRecords.push(`${a}-${b}`);
        
        // セットカウント更新
        if (setWinner === 'A') state.setA++; 
        else state.setB++;

        // 試合終了判定（2セット先取）
        if (state.setA === 2 || state.setB === 2) {
            const matchWinner = state.setA === 2 ? 'A' : 'B';
            alert(`試合終了！ 2セット先取により TEAM ${matchWinner} の勝利です！`);
            
            // 試合終了後は操作できないようにする
            state.servingTeam = null; 
            render();
            return; // 処理終了
        }

        // 次のセットへ向けたリセット
        state.scoreA = 0;
        state.scoreB = 0;
        state.servingTeam = null;
        state.selectedPlayersA = [];
        state.selectedPlayersB = [];

        // サーブ権選択エリアを再表示
        const selector = document.getElementById('serve-selector');
        if (selector) selector.style.display = 'block';
        
        render();
    }
}

function undo() {
    if (state.history.length === 0) return;
    if (confirm("1点戻しますか？")) {
        const last = state.history.pop();
        const prev = last.snap;
        state.scoreA = prev.scoreA;
        state.scoreB = prev.scoreB;
        state.setA = prev.setA;
        state.setB = prev.setB;
        state.servingTeam = prev.servingTeam;
        state.playersA = [...prev.playersA];
        state.playersB = [...prev.playersB];
        
        if (state.servingTeam === null) {
            document.getElementById('serve-selector').style.display = 'block';
        }
        render();
    }
}

function exportCSV() {
    const teamA = document.getElementById('team-name-a').value || "Team A";
    const teamB = document.getElementById('team-name-b').value || "Team B";
    const setSummary = state.setRecords.length > 0 ? state.setRecords.join(' / ') : "なし";

    let csv = "\uFEFF"; 
    csv += `対戦,${teamA} VS ${teamB}\n最終セットスコア,${state.setA}-${state.setB}\nセット履歴,${setSummary}\n\n`;
    csv += "スコア,得点チーム,担当選手,理由\n";

    state.history.forEach(h => {
        const winnerName = (h.team === 'A') ? teamA : teamB;
        csv += `${h.score},${winnerName},${h.actor},${h.reason}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `結果_${teamA}_vs_${teamB}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function resetGame() {
    if(confirm("リセットしますか？")) location.reload();
}

init();