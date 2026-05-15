const POS_LABELS = [1, 6, 5, 4, 3, 2];

let state = {
    scoreA: 0,
    scoreB: 0,
    setA: 0,
    setB: 0,
    setRecords: [],
    servingTeam: null,
    playersA: ["A1", "A6", "A5", "A4", "A3", "A2"],
    playersB: ["B1", "B6", "B5", "B4", "B3", "B2"],
    history: [],
    selectedPlayerA: null,
    selectedPlayerB: null
};

function init() {
    render();
}

function setInitialServe(team) {
    state.servingTeam = team;
    document.getElementById('toss-area').classList.add('hidden');
    document.getElementById('active-indicators').classList.remove('hidden');
    render();
}

function render() {
    document.getElementById('display-score-a').innerText = state.scoreA;
    document.getElementById('display-score-b').innerText = state.scoreB;
    document.getElementById('set-count-a').innerText = state.setA;
    document.getElementById('set-count-b').innerText = state.setB;
    
    const nameA = state.selectedPlayerA !== null ? state.playersA[state.selectedPlayerA] : "なし";
    const nameB = state.selectedPlayerB !== null ? state.playersB[state.selectedPlayerB] : "なし";
    document.getElementById('selected-player-display-a').innerText = `選択: ${nameA}`;
    document.getElementById('selected-player-display-b').innerText = `選択: ${nameB}`;

    const isStarted = state.servingTeam !== null;
    if (isStarted) {
        document.getElementById('indicator-a').classList.toggle('active', state.servingTeam === 'A');
        document.getElementById('indicator-b').classList.toggle('active', state.servingTeam === 'B');
    }

    const isA = (state.servingTeam === 'A');
    const isB = (state.servingTeam === 'B');

    const isNotServerA = (state.selectedPlayerA !== null && state.selectedPlayerA !== 0);
    const isNotServerB = (state.selectedPlayerB !== null && state.selectedPlayerB !== 0);

    const buttons = document.querySelectorAll('.button-section button');
    buttons.forEach(btn => btn.disabled = !isStarted);

    if (isStarted) {
        const isA = (state.servingTeam === 'A');
        const isB = (state.servingTeam === 'B');
        document.getElementById('btn-serve-win-a').disabled = !isA || isNotServerA;
        document.getElementById('btn-serve-err-a').disabled = !isA || isNotServerA;
        document.getElementById('btn-serve-win-b').disabled = !isB || isNotServerB;
        document.getElementById('btn-serve-err-b').disabled = !isB || isNotServerB;
    }

    drawSide('a', state.playersA);
    drawSide('b', state.playersB);
}

function drawSide(id, players) {
    const grid = document.getElementById(`grid-${id}`);
    if (!grid) return;
    grid.innerHTML = '';

    let visualOrder = (id === 'a') ? [2, 3, 1, 4, 0, 5] : [5, 0, 4, 1, 3, 2];

    visualOrder.forEach((idx) => {
        const box = document.createElement('div');
        box.className = 'player-box';
        box.onclick = () => selectPlayer(id, idx);
        if ((id === 'a' && state.selectedPlayerA === idx) || (id === 'b' && state.selectedPlayerB === idx)) {
            box.classList.add('selected');
        }
        if (state.servingTeam === id.toUpperCase() && idx === 0) {
            box.classList.add('server-highlight');
        }

        box.innerHTML = `
            <span class="pos-tag">P${POS_LABELS[idx]}</span>
            <input type="text" class="p-input" value="${players[idx]}" 
                onclick="event.stopPropagation()"
                onchange="updatePlayerName('${id}', ${idx}, this.value)">
        `;
        grid.appendChild(box);
    });
}

function selectPlayer(team, idx) {
    if (team === 'a') {
        state.selectedPlayerA = (state.selectedPlayerA === idx) ? null : idx;
    } else {
        state.selectedPlayerB = (state.selectedPlayerB === idx) ? null : idx;
    }
    render();
}

function updatePlayerName(team, idx, val) {
    if (team === 'a') state.playersA[idx] = val;
    else state.playersB[idx] = val;
}

function addPoint(winner, reason) {
    // 1. 誰がプレイしたか(プレイヤー名)を安全に取得
    let actorName = "-";
    
    // 得点・失点ボタンが押された側のチームを判定
    // 「相手ミス」「サーブミス」のボタンが押された場合は、得点チーム(winner)とは「逆のチーム」のプレイヤーを見る
    const isLossButton = (reason === '相手ミス' || reason === 'サーブミス');
    const pressedTeam = isLossButton ? (winner === 'A' ? 'B' : 'A') : winner;

    if (pressedTeam === 'A' && state.selectedPlayerA !== null) {
        actorName = state.playersA[state.selectedPlayerA] || "-";
    } else if (pressedTeam === 'B' && state.selectedPlayerB !== null) {
        actorName = state.playersB[state.selectedPlayerB] || "-";
    }

    // 2. スナップショットを正確にコピー（ローテーション前の状態を保存）
    const prevState = {
        scoreA: state.scoreA,
        scoreB: state.scoreB,
        setA: state.setA,
        setB: state.setB,
        servingTeam: state.servingTeam,
        playersA: [...state.playersA],
        playersB: [...state.playersB]
    };

    // 3. 【最重要】サーブ権移動の判定とローテーション処理
    // 得点したチーム(winner)が、直前にサーブを打っていたチーム(state.servingTeam)と異なる場合がサイドアウトです
    const isSideOut = (state.servingTeam !== winner);

    if (winner === 'A') {
        state.scoreA++;
        if (isSideOut) {
            state.servingTeam = 'A';
            rotate('A'); // Aチームのローテーションを確実に実行
        }
    } else {
        state.scoreB++;
        if (isSideOut) {
            state.servingTeam = 'B';
            rotate('B'); // Bチームのローテーションを確実に実行
        }
    }

    // 4. 履歴（CSV用データ）への保存
    state.history.push({
        time: new Date().toLocaleTimeString(),
        score: `${state.scoreA}-${state.scoreB}`,
        team: winner,
        reason: reason,
        actor: actorName,
        snap: prevState
    });

    // 5. プレイヤーの選択状態をクリア
    state.selectedPlayerA = null;
    state.selectedPlayerB = null;

    // 6. 画面を即座に更新（これでスコアと位置がパッと変わります）
    render();

    // 7. セット終了判定は画面更新が終わった後に安全に実行
    setTimeout(() => {
        checkSetEnd();
    }, 10);
}

function rotate(team) {
    const p = (team === 'A') ? state.playersA : state.playersB;
    if (p.length > 0) {
        p.unshift(p.pop());
    }
}

function resetGame() {
    if(confirm("リセットしますか？")) {
        state.scoreA = 0; state.scoreB = 0;
        state.setA = 0; state.setB = 0;
        state.setRecords = [];
        state.servingTeam = null;
        state.history = [];
        document.getElementById('toss-area').classList.remove('hidden');
        document.getElementById('active-indicators').classList.add('hidden');
        render();
    }
}

function exportCSV() {
    const teamA = document.getElementById('team-name-a').value || "Team A";
    const teamB = document.getElementById('team-name-b').value || "Team B";
    const setSummary = state.setRecords.length > 0 ? state.setRecords.join(' / ') : "なし";

    let csv = "\uFEFF"; 
    csv += `対戦,${teamA} VS ${teamB}\n`;
    csv += `最終セットスコア,${state.setA}-${state.setB}\n`;
    csv += `各セット詳細,${setSummary}\n\n`;
    csv += "セット,スコア,得点チーム,担当,理由\n";

    state.history.forEach(h => {
        const setNum = (h.snap.setA + h.snap.setB + 1);
        const winnerName = (h.team === 'A') ? teamA : teamB;
        csv += `第${setNum}セット,${h.score},${winnerName},${h.actor},${h.reason}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `試合結果_${teamA}_vs_${teamB}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function undo() {
    if (state.history.length === 0) {
        alert("戻れる履歴がありません");
        return;
    }

    if (confirm("最後のアクションを取り消して、サーブ権と配置を戻しますか？")) {
        const lastAction = state.history.pop();
        const prev = lastAction.snap;

        state.scoreA = prev.scoreA;
        state.scoreB = prev.scoreB;
        state.setA = prev.setA;
        state.setB = prev.setB;
        state.servingTeam = prev.servingTeam;
        state.playersA = [...prev.playersA];
        state.playersB = [...prev.playersB];

        if (state.servingTeam === null) {
            document.getElementById('toss-area').classList.remove('hidden');
            document.getElementById('active-indicators').classList.add('hidden');
        }
        render();
    }
}

init();