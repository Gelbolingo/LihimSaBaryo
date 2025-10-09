(function() {
    // ==================== CONFIGURATION ====================
    const roleConfig = {
        6: { creatures: 1, humans: 5, abilities: 2, villagers: 3 },
        7: { creatures: 1, humans: 6, abilities: 2, villagers: 4 },
        8: { creatures: 2, humans: 6, abilities: 3, villagers: 3 },
        9: { creatures: 2, humans: 7, abilities: 3, villagers: 4 },
        10: { creatures: 3, humans: 7, abilities: 4, villagers: 3 },
        11: { creatures: 3, humans: 8, abilities: 4, villagers: 4 },
        12: { creatures: 4, humans: 8, abilities: 4, villagers: 4 }
    };

    const creatureCards = [
        "Aswang [KILLER]",
        "Manananggal [KILLER/RECON]",
        "Mangkukulam [KILLER]",
        "Tiyanak [KILLER]",
        "Duwende [DECEIVER]",
        "Kapre [DECEIVER]",
        "Tikbalang [DECEIVER]",
        "Tiktik [RECON]",
        "Batibat [DECEIVER]"
    ];

    const humanCards = [
        "Manunugis [KILLER]",
        "Albularyo [SUPPORT]",
        "Bagani [SUPPORT]",
        "Mang-aanting [SUPPORT]",
        "Babaylan [UTILITY]",
        "Kapitan [UTILITY]",
        "Kampanero [UTILITY]",
        "Manlalakbay [UTILITY]"
    ];

    // ==================== UTILITY FUNCTIONS ====================
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function isCreatureRole(role) {
        return creatureCards.some(card => role.includes(card.split(' [')[0]));
    }

    function findPlayerByNumber(players, num) {
        return players.find(p => p.number === num);
    }

    function saveGameState(state) {
        try {
            localStorage.setItem('gameState', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save game state:', e);
        }
    }

    function loadGameState() {
        try {
            const state = localStorage.getItem('gameState');
            return state ? JSON.parse(state) : null;
        } catch (e) {
            console.error('Failed to load game state:', e);
            return null;
        }
    }

    function clearGameState() {
        localStorage.removeItem('gameState');
    }

    // ==================== REVEAL CARD FUNCTION ====================
    function showRevealCard(message) {
        const card = document.getElementById("revealCard");
        const titleEl = document.getElementById("revealTitle");
        const msgEl = document.getElementById("revealMessage");
        const closeBtn = document.getElementById("closeReveal");

        if (!card) {
            // Fallback if revealCard doesn't exist
            alert(message);
            return;
        }

        titleEl.textContent = "Revelation";
        msgEl.textContent = message;
        card.classList.remove("hidden");

        closeBtn.onclick = () => {
            card.classList.add("hidden");
        };
    }

    // ==================== REVEAL ====================
    function getAuraForPlayer(player) {
        if (!player || !player.role) return "Unknown";
        if (isCreatureRole(player.role)) return "Maitim na Aura";
        if (/\[KILLER\]|\[SUPPORT\]|\[UTILITY\]|\[RECON\]|\[DECEIVER\]/.test(player.role)) return "May Kapangyarihan";
        return "Mortal";
    }

    function showImmediateReveal(actor, targetPlayer, skillType) {
        // actor: current player object; targetPlayer: the target player object
        if (!actor || !targetPlayer) return;

        let message = "";
        // Babaylan reveals full role even if her skill type is 'investigate'
        if (actor.role && actor.role.includes('Babaylan')) {
            message = `You (Player ${actor.number} - ${actor.role}) revealed Player ${targetPlayer.number}: ${targetPlayer.role}`;
        } else if (skillType === 'reveal') {
            // roles like Manananggal and Tiktik that have 'reveal' skill
            message = `You (Player ${actor.number} - ${actor.role}) revealed Player ${targetPlayer.number}: ${targetPlayer.role}`;
        } else if (skillType === 'investigate') {
            // This shouldn't happen anymore, but keeping for safety
            const aura = getAuraForPlayer(targetPlayer);
            message = `You (Player ${actor.number} - ${actor.role}) discovered Player ${targetPlayer.number}: ${aura}`;
        } else if (skillType === 'observe') {
            // Manlalakbay shows aura categories
            const aura = getAuraForPlayer(targetPlayer);
            message = `You (Player ${actor.number} - ${actor.role}) discovered Player ${targetPlayer.number}: ${aura}`;
        }

        if (message) {
            // simple blocking display so the player sees the result before next turn
            showRevealCard(message);
        }
    }


    // ==================== LOBBY PAGE ====================
    window.createLobby = function() {
        const countInput = document.getElementById('playerCount');
        if (!countInput) return;

        const count = parseInt(countInput.value);
        if (count < 6 || count > 12) {
            alert('Please enter a number between 6 and 12');
            return;
        }

        const config = roleConfig[count];
        const roles = [];
        
        roles.push(...Array(config.creatures).fill("Creature"));
        roles.push(...Array(config.abilities).fill("Ability Human"));
        roles.push(...Array(config.villagers).fill("Villager"));

        const shuffledRoleSlots = shuffle(roles);
        const shuffledCreatures = shuffle(creatureCards);
        const shuffledHumans = shuffle(humanCards);

        const players = shuffledRoleSlots.map((slot, i) => {
            let finalRole = slot;
            if (slot === "Creature") finalRole = shuffledCreatures.pop();
            else if (slot === "Ability Human") finalRole = shuffledHumans.pop();
            else if (slot === "Villager") finalRole = "Tagabaryo";
            
            return {
				number: i + 1,
				name: `Player ${i + 1}`,
				role: finalRole,
				alive: true,
				protected: false,
				protectedBy: null,
				anting: 0,
				cursed: false,
				silenced: false,
				paralyzed: false,
				immuneToInvestigations: finalRole.includes('Mang-aanting'),
				immuneToReveals: finalRole.includes('Mang-aanting'),
				meta: { 
					cooldowns: {},
					baganiProtectedPlayers: [] 
				}
			};
        });

        const gameState = {
            players: players,
            currentPlayerIndex: 0,
            dayNumber: 1,
            nightLog: [],
            nightActions: [],
            maxDays: count
        };

        saveGameState(gameState);

        document.getElementById('distribution').innerHTML = `
            <p><strong>Creatures:</strong> ${config.creatures}</p>
            <p><strong>Humans with Abilities:</strong> ${config.abilities}</p>
            <p><strong>Villagers (Tagabaryo):</strong> ${config.villagers}</p>
           
        `;

        const playerList = document.getElementById('playerList');
        playerList.innerHTML = players.map(p => {
            const isCreature = isCreatureRole(p.role);
            const tag = isCreature ? 'creature' : 'human';
            return `<li>${p.name} - ${p.role} <span class="role-tag ${tag}">${isCreature ? 'CREATURE' : 'HUMAN'}</span></li>`;
        }).join('');

        document.getElementById('lobbyInfo').classList.remove('hidden');
    };

    window.startGame = function() {
        window.location.href = 'night.html';
    };

    // ==================== SKILL SYSTEM ====================
    function getSkillsForRole(role) {
        if (role.includes('Aswang')) return [{ name: "Kill", type: "kill", needsTarget: true, cooldown: 2 }];
        if (role.includes('Manananggal')) return [
            { name: "Kill", type: "kill", needsTarget: true, cooldown: 2 },
            { name: "Reveal Role", type: "reveal", needsTarget: true, cooldown: 2 }
        ];
        if (role.includes('Mangkukulam')) return [{ name: "Curse", type: "curse", needsTarget: true, cooldown: 2 }];
        if (role.includes('Tiyanak')) return []; // Tiyanak has no active skills
        if (role.includes('Duwende'))  return [{ name: "Cancel All Human Abilities", type: "cancelAllAbilities", needsTarget: false, cooldown: 2 }];
        if (role.includes('Kapre')) return [{ name: "Create Smoke (block investigations)", type: "blockInvestigations", needsTarget: false, cooldown: 2 }];
        if (role.includes('Tikbalang')) return [{ name: "Silence", type: "silence", needsTarget: true, cooldown: 2 }];
        if (role.includes('Tiktik')) return [{ name: "Reveal Role", type: "reveal", needsTarget: true, cooldown: 2 }];
        if (role.includes('Batibat')) return [{ name: "Haunt (paralyze)", type: "haunt", needsTarget: true, cooldown: 2 }];

        if (role.includes('Manunugis')) return [{ name: "Shoot", type: "kill", needsTarget: true, cooldown: 2 }];
        if (role.includes('Albularyo')) return [{ name: "Protect from Curse/Silence", type: "albularyo_protect", needsTarget: true, cooldown: 2 }];
        if (role.includes('Bagani')) return [{ name: "Protect", type: "protect", needsTarget: true, cooldown: 2 }];
        if (role.includes('Mang-aanting')) return [{ name: "Protect from Death", type: "protect", needsTarget: true, cooldown: 2 }];
        if (role.includes('Babaylan')) return [{ name: "Investigate", type: "investigate", needsTarget: true, cooldown: 2 }];
        if (role.includes('Kapitan')) return [{ name: "Lockdown (prevent all kills)", type: "preventKill", needsTarget: false, cooldown: 3 }];
        if (role.includes('Kampanero')) return [{ name: "Skip Discussion", type: "skipDiscussion", needsTarget: false, cooldown: 2 }];
        if (role.includes('Manlalakbay')) return [{ name: "Observe", type: "observe", needsTarget: true, cooldown: 2 }];
        
        return [];
    }

    // ==================== NIGHT PHASE ====================
    let nightState = null;

    function initNightPhase() {
        const gameState = loadGameState();
        if (gameState) {
            gameState.phase = "night";
            saveGameState(gameState);
        }
        updateBackground();   

        if (!gameState) {
            alert('No game found. Please start from lobby.');
            window.location.href = 'lobby.html';
            return;
        }

        // Sort players: Batibat first, then other creatures, then humans
        gameState.players.sort((a, b) => {
            const aIsBatibat = a.role.includes('Batibat');
            const bIsBatibat = b.role.includes('Batibat');
            const aIsCreature = isCreatureRole(a.role);
            const bIsCreature = isCreatureRole(b.role);

            // Batibat always goes first
            if (aIsBatibat && !bIsBatibat) return -1;
            if (!aIsBatibat && bIsBatibat) return 1;

            // Then other creatures
            if (aIsCreature && !bIsCreature) return -1;
            if (!aIsCreature && bIsCreature) return 1;

            // Within same group, maintain player number order
            return a.number - b.number;
        });

        nightState = {
            gameState: gameState,
            currentIndex: 0,
            nightActions: []
        };

        document.getElementById('nightNumber').textContent = gameState.dayNumber;
        loadPlayer();
    }

    function loadPlayer() {
        if (!nightState) return;

        const { gameState, currentIndex } = nightState;

        if (currentIndex >= gameState.players.length) {
            document.getElementById('playerCard').classList.add('hidden');
            document.getElementById('proceedArea').classList.remove('hidden');
            resolveNightActions();
            return;
        }

        const player = gameState.players[currentIndex];
        document.getElementById('playerName').textContent = `Player ${player.number}`;
        document.getElementById('playerRole').textContent = `${player.role}${player.alive ? "" : " (DEAD)"}`;
        
        const statusEl = document.getElementById('statusEffects');
        const statuses = [];
        if (player.anting > 0) statuses.push(`Anting-Anting: ${player.anting}`);
        if (player.cursed) statuses.push('CURSED');
        if (player.silenced) statuses.push('SILENCED');
        if (player.paralyzed) statuses.push('PARALYZED');
        statusEl.textContent = statuses.length ? `Status: ${statuses.join(', ')}` : '';

        const circleArea = document.getElementById('circleArea');
        circleArea.classList.add('hidden');
        circleArea.innerHTML = '';
        
        const isTagabaryo = player.role.includes('Tagabaryo');
        const isTiyanak = player.role.includes('Tiyanak');
        const isParalyzed = player.paralyzed;
        
        document.getElementById('useBtn').style.display = (player.alive && !isTagabaryo && !isTiyanak && !isParalyzed) ? 'inline-block' : 'none';
    }

    window.useSkill = function() {
        if (!nightState) return;

        const { gameState, currentIndex } = nightState;
        const cur = gameState.players[currentIndex];

        if (!cur || !cur.alive) {
            nightState.currentIndex++;
            loadPlayer();
            return;
        }

        if (cur.paralyzed) {
            alert('You are paralyzed by Batibat and cannot use your ability tonight!');
            nightState.currentIndex++;
            loadPlayer();
            return;
        }

        const skills = getSkillsForRole(cur.role);
        const circleArea = document.getElementById('circleArea');
        circleArea.innerHTML = '';

        if (skills.length > 0) {
            skills.forEach(skill => {
                const btn = document.createElement('button');
                btn.className = 'skill-btn';
                const cd = cur.meta.cooldowns[skill.type] || 0;
                btn.textContent = cd > 0 ? `${skill.name} (Cooldown: ${cd})` : skill.name;
                btn.disabled = cd > 0;

                btn.onclick = () => {
                    if (skill.needsTarget) {
                        showTargetSelection(skill);
                    } else {
                        nightState.nightActions.push({
                            actorNumber: cur.number,
                            role: cur.role,
                            type: skill.type,
                            skillName: skill.name
                        });
                        cur.meta.cooldowns[skill.type] = skill.cooldown || 0;
                        nightState.currentIndex++;
                        loadPlayer();
                    }
                };
                circleArea.appendChild(btn);
            });
        } else {
            circleArea.innerHTML = '<p>This role has no special skills.</p>';
        }

        circleArea.classList.remove('hidden');
    };

    function showTargetSelection(skill) {
    if (!nightState) return;

    const { gameState, currentIndex } = nightState;
    const cur = gameState.players[currentIndex];
    const circleArea = document.getElementById('circleArea');
    circleArea.innerHTML = '';

    // Sort players by number for target selection display
    const sortedPlayers = gameState.players.slice().sort((a, b) => a.number - b.number);

    sortedPlayers.forEach(p => {
        // Bagani special rules: cannot protect himself, cannot protect same player twice
        const isBagani = cur.role.includes('Bagani');
        const isSelf = p.number === cur.number;
        const alreadyProtectedByBagani = isBagani && cur.meta.baganiProtectedPlayers && cur.meta.baganiProtectedPlayers.includes(p.number);
        
        // Mang-aanting can now only target others, not himself
        const isMangAanting = cur.role.includes('Mang-aanting');

        // Albularyo can target himself too
        const isAlbularyo = cur.role.includes('Albularyo');
        const canTargetSelf = isAlbularyo;
        
        if (p.alive && !(isSelf && !canTargetSelf) && !alreadyProtectedByBagani) {
                const div = document.createElement('div');
                div.className = 'player-circle';
                div.textContent = `P${p.number}`;

                div.onclick = () => {
                    nightState.nightActions.push({
                        actorNumber: cur.number,
                        role: cur.role,
                        type: skill.type,
                        target: p.number,
                        skillName: skill.name
                    });

                    cur.meta.cooldowns[skill.type] = skill.cooldown || 0;

                    // Track Bagani protected players
                    if (isBagani) {
                        if (!cur.meta.baganiProtectedPlayers) {
                            cur.meta.baganiProtectedPlayers = [];
                        }
                        cur.meta.baganiProtectedPlayers.push(p.number);
                    }

                    // BATIBAT FIX: Apply paralysis immediately when Batibat targets someone

                    // BATIBAT FIX: Apply paralysis immediately when Batibat targets someone
                    if (skill.type === "haunt" && p) {
                        p.paralyzed = true;
                        alert(`Player ${p.number} has been paralyzed and cannot act tonight!`);
                    }

                    // Removed immediate reveals - all reveals now processed in night resolution

                    nightState.currentIndex++;
                    loadPlayer();
                };

                circleArea.appendChild(div);
            }
        });

        const backBtn = document.createElement('button');
        backBtn.className = 'skill-btn back';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => window.useSkill();
        circleArea.appendChild(backBtn);
    }

    window.skipPlayer = function() {
        if (!nightState) return;

        const { gameState, currentIndex } = nightState;
        const cur = gameState.players[currentIndex];
        
        nightState.nightActions.push({
            actorNumber: cur.number,
            role: cur.role,
            type: "skip"
        });
        
        nightState.currentIndex++;
        loadPlayer();
    };

    // ==================== NIGHT RESOLUTION ====================
    function resolveNightActions() {
        if (!nightState) return;

        const { gameState, nightActions } = nightState;
        gameState.nightLog = [];

        if (nightActions.length === 0) {
            gameState.nightLog.push({
                type: "quiet_night",
                text: "A quiet night passes..."
            });
            saveGameState(gameState);
            return;
        }

        const global = {
            preventKills: false,
            kapreBlockInvestigations: false
        };

        const addLog = (action, details = {}) => {
            const actor = findPlayerByNumber(gameState.players, action.actorNumber);
            const target = action.target ? findPlayerByNumber(gameState.players, action.target) : null;

            gameState.nightLog.push({
                actorNumber: actor ? actor.number : action.actorNumber,
                actorName: actor ? `Player ${actor.number}` : `Player ${action.actorNumber}`,
                actorRole: actor ? actor.role : action.role || "Unknown",
                skillName: action.skillName || action.type || "Skill",
                targetNumber: target ? target.number : null,
                targetName: target ? `Player ${target.number}` : null,
                ...details
            });
        };

        // ======= PHASE 1: Global effects =======
        nightActions.forEach(a => {
            if (a.type === "preventKill") {
                global.preventKills = true;
                addLog(a, { type: "kapitan_prevent" });
            }
            if (a.type === "cancelAllAbilities") {
                gameState.players.forEach(p => {
                    if (!isCreatureRole(p.role) && p.role !== 'Tagabaryo') {
                        p.skillCancelled = true;
                    }
                });
                addLog(a, { type: "cancelAllAbilities" });
            }
            if (a.type === "blockInvestigations") {
                global.kapreBlockInvestigations = true;
                addLog(a, { type: "kapre_block" });
            }
            if (a.type === "skipDiscussion") {
                gameState.skipDiscussion = true;
                addLog(a, { type: "skipDiscussion" });
            }
        });

        const canceledActionIndices = new Set();

        // ======= PHASE 2: Buffs / Debuffs / Curses =======
        nightActions.forEach((a, i) => {
            if (canceledActionIndices.has(i)) return;
            const targ = a.target ? findPlayerByNumber(gameState.players, a.target) : null;
            const actor = findPlayerByNumber(gameState.players, a.actorNumber);

            if (actor && actor.skillCancelled) {
                addLog(a, { type: "cancelled_action", cancelled: true });
                canceledActionIndices.add(i);
                return;
            }

            // Check if actor is paralyzed (skip their action)
            if (actor && actor.paralyzed && a.type !== "haunt") {
                canceledActionIndices.add(i);
                return;
            }

            switch (a.type) {
                case "haunt":
                    if (targ) {
                        // Paralysis already applied in showTargetSelection
                        addLog(a, { type: "haunt" });
                    }
                    break;
                case "silence":
                    if (targ) {
                        targ.silenced = true;
                        addLog(a, { type: "silence" });
                    }
                    break;
                case "albularyo_protect":
                    if (targ) {
                        if (targ.cursed) {
                            targ.cursed = false;
                            addLog(a, { type: "heal_curse" });
                        }
                        if (targ.silenced) {
                            targ.silenced = false;
                            addLog(a, { type: "heal_silence" });
                        }
                    }
                    break;
                case "heal":
                    if (targ) {
                        if (targ.cursed) {
                            targ.cursed = false;
                            addLog(a, { type: "heal_curse" });
                        } else {
                            targ.protected = true;
                            targ.protectedBy = a.role;
                            addLog(a, { type: "protect" });
                        }
                    }
                    break;
                case "protect":
                    if (targ) {
                        targ.protected = true;
                        targ.protectedBy = a.role;
                        addLog(a, { type: "protect" });
                    } else {
                        addLog(a, { type: "protect", text: `${a.role} tried to protect but found no valid target.` });
                    }
                    break;
                case "grantAnting":
                    if (targ) {
                        targ.anting = (targ.anting || 0) + 1;
                        targ.immuneToReveals = true;
                        addLog(a, { type: "grantAnting" });
                    }
                    break;
                case "curse":
                    if (targ) {
                        targ.cursed = true;
                        addLog(a, { type: "curse" });
                    }
                    break;
            }
        });

        // ======= PHASE 3: Investigations / Reveals =======
        nightActions.forEach((a, i) => {
            if (canceledActionIndices.has(i)) return;
            if (!["investigate", "reveal", "observe"].includes(a.type)) return;

            const actor = findPlayerByNumber(gameState.players, a.actorNumber);
            
            // Check if actor's skill was cancelled by Duwende
            if (actor && actor.skillCancelled) {
                addLog(a, { type: "cancelled_action", cancelled: true });
                canceledActionIndices.add(i);
                return;
            }

            const targ = findPlayerByNumber(gameState.players, a.target);

            if (!targ || global.kapreBlockInvestigations || targ.immuneToInvestigations) {
                addLog(a, { type: "investigate_fail" });
                return;
            }

            // Check for Anting-Anting reveal immunity
            if ((a.type === "reveal" || a.type === "investigate") && targ.immuneToReveals) {
                addLog(a, { type: "investigate_fail" });
                return;
            }

            if (a.type === "investigate") {
                const kind = isCreatureRole(targ.role) ? "Mythical" : "Human";
                addLog(a, { type: "investigate_success", result: `${kind} — ${targ.role}` });
            } else if (a.type === "reveal") {
                addLog(a, { type: "reveal", result: `${targ.role}` });
            } else if (a.type === "observe") {
                let result = "Mortal";
                if (isCreatureRole(targ.role)) result = "Dark Aura";
                else if (/\[KILLER\]|\[SUPPORT\]|\[UTILITY\]/.test(targ.role)) result = "With Powers";
                addLog(a, { type: "observe", result });
            }
        });

       // ======= PHASE 4: Kills =======
        if (!global.preventKills) {
            nightActions.forEach((a, i) => {
                if (canceledActionIndices.has(i)) return;
                if (!["kill", "attack", "shoot"].includes(a.type)) return;
                
                const actor = findPlayerByNumber(gameState.players, a.actorNumber);
                
                // Check if actor's skill was cancelled by Duwende
                if (actor && actor.skillCancelled) {
                    addLog(a, { type: "cancelled_action", cancelled: true });
                    canceledActionIndices.add(i);
                    return;
                }
                
                const targ = findPlayerByNumber(gameState.players, a.target);
                if (!targ || !targ.alive) return;

                if (targ.anting && targ.anting > 0) {
                    targ.anting -= 1;
                    addLog(a, { type: "anting_block" });
                    return;
                }
                if (targ.protected) {
                    addLog(a, { type: "kill_blocked" });
                    return;
                }

                targ.alive = false;
                addLog(a, { type: "kill" });

                if (targ.role.includes('Tiyanak')) {
                    const killer = findPlayerByNumber(gameState.players, a.actorNumber);
                    if (killer && killer.alive) {
                        killer.alive = false;
                        gameState.nightLog.push({
                            type: "revenge",
                            actorName: `Player ${killer.number}`,
                            actorRole: killer.role,
                            skillName: "Revenge",
                            targetName: `Player ${targ.number}`
                        });
                    }
                }
            });
        } else {
            nightActions.forEach((a, i) => {
                if (canceledActionIndices.has(i)) return;
                if (!["kill", "attack", "shoot"].includes(a.type)) return;
                
                const targ = findPlayerByNumber(gameState.players, a.target);
                if (!targ || !targ.alive) return;
                
                addLog(a, { type: "kapitan_blocked_kill" });
            });
        }

        // ======= PHASE 5: Cursed deaths =======
        gameState.players.forEach(p => {
            if (p.cursed && p.alive) {
                p.alive = false;
                gameState.nightLog.push({
                    actorName: `Player ${p.number}`,
                    actorRole: p.role,
                    skillName: "Cursed Death",
                    type: "cursed_death",
                    target: p.number
                });
            }
        });

        // ======= PHASE 6: Cooldowns and cleanup =======
        gameState.players.forEach(p => {
            if (p.meta && p.meta.cooldowns) {
                Object.keys(p.meta.cooldowns).forEach(k => {
                    if (typeof p.meta.cooldowns[k] === "number") {
                        p.meta.cooldowns[k] = Math.max(0, p.meta.cooldowns[k] - 1);
                    }
                });
            }
            p.skillCancelled = false;
            p.protected = false;
            p.protectedBy = null;
            p.paralyzed = false;
            p.silenced = false;
        });

        if (gameState.nightLog.length === 0) {
            gameState.nightLog.push({
                type: "no_action",
                text: "No actions were recorded tonight."
            });
        }

        saveGameState(gameState);
    }

    function advancePhase(toPhase) {
        const gameState = loadGameState();
        if (!gameState) return;

        if (toPhase === "night") {
            gameState.phase = "night";
            saveGameState(gameState);
            window.location.href = "night.html";
        } else if (toPhase === "day") {
            gameState.phase = "day";
            saveGameState(gameState);
            window.location.href = "day.html";
        }
    }

    // ===================== PHASE DISPLAY CONTROL =====================
    function updatePhaseDisplay() {
        const gameState = loadGameState();
        if (!gameState) return;

        let phaseName = "";
        switch (gameState.phase) {
            case "night": phaseName = "Night"; break;
            case "day": phaseName = "Day"; break;
            case "discussion": phaseName = "Discussion"; break;
            default: phaseName = "Day";
        }

        const num = gameState.dayNumber || 1;

        const el = document.getElementById("phaseLabel");
        if (el) el.textContent = `${phaseName} ${num}`;

        const nightNum = document.getElementById("nightNumber");
        if (nightNum) nightNum.textContent = num;

        const dayNum = document.getElementById("dayNumDisplay");
        if (dayNum) dayNum.textContent = num;

        const voteDay = document.getElementById("voteDayNum");
        if (voteDay) voteDay.textContent = num;
    }

    document.addEventListener("DOMContentLoaded", updatePhaseDisplay);

    // ==================== DAY PHASE ====================
    function initDayPhase() {
        const gameState = loadGameState();
        if (gameState) {
            gameState.phase = "day";
            saveGameState(gameState);
        }
        updateBackground();
        if (!gameState) {
            alert('No game found.');
            window.location.href = 'lobby.html';
            return;
        }

        document.getElementById('dayNumDisplay').textContent = gameState.dayNumber;
        
        const summary = document.getElementById('nightSummary');
        if (gameState.nightLog.length) {
            summary.innerHTML = "<h3>Night Summary</h3>" +
                "<ul>" + gameState.nightLog.map(x=> `<li>${formatEvent(x)}</li>`).join("") + "</ul>";
        } else {
            summary.innerHTML = "<h3>Night Summary</h3><p>No actions recorded.</p>";
        }

        // Display silenced players
        const silencedPlayers = gameState.players.filter(p => p.alive && p.silenced);
        if (silencedPlayers.length > 0) {
            const silencedDiv = document.createElement('div');
            silencedDiv.style.marginTop = '20px';
            silencedDiv.style.padding = '15px';
            silencedDiv.style.backgroundColor = '#ffebcc';
            silencedDiv.style.border = '2px solid #ff9800';
            silencedDiv.style.borderRadius = '8px';
            silencedDiv.innerHTML = "<h3 style='color: #e65100;'>⚠️ SILENCED PLAYERS (Cannot speak in discussion)</h3>" +
                "<ul>" + silencedPlayers.map(p => `<li><strong>Player ${p.number}</strong> - ${p.role}</li>`).join("") + "</ul>";
            summary.appendChild(silencedDiv);
        }

        const discussionBtn = document.getElementById('discussionBtn');
        const continueVoteBtn = document.getElementById('continueVoteBtn');

        if (gameState.skipDiscussion) {
            discussionBtn.style.display = 'none';
            continueVoteBtn.style.display = 'block';
            continueVoteBtn.onclick = () => {
                window.location.href = 'voting.html';
            };
        } else {
            discussionBtn.style.display = 'block';
            continueVoteBtn.style.display = 'none';
        }
    }

    function formatEvent(e) {
        function actorText(e) {
            if (e.actorRole && e.actorLabel) return `${e.actorRole} (${e.actorLabel})`;
            if (e.actorRole) return `${e.actorRole}`;
            return "Someone";
        }

        switch (e.type) {
            case "kill": return `${actorText(e)} killed Player ${e.targetNumber}.`;
            case "kill_blocked": return `${actorText(e)} tried to kill Player ${e.targetNumber} but was blocked by protection.`;
            case "kapitan_blocked_kill": return `${actorText(e)} attempted to kill Player ${e.targetNumber}, but Kapitan's lockdown prevented it.`;
            case "curse": return `${actorText(e)} cursed Player ${e.targetNumber}.`;
            case "cursed_death": return `Player ${e.target} died from a curse.`; 
            case "heal_curse": return `${actorText(e)} healed Player ${e.targetNumber}, removing their curse.`;
            case "heal_silence": return `${actorText(e)} healed Player ${e.targetNumber}, removing their silence.`;
            case "protect": return `${actorText(e)} protected Player ${e.targetNumber} from death.`;
            case "grantAnting": return `${actorText(e)} granted Anting-Anting to Player ${e.targetNumber}.`;
            case "anting_block": return `Anting-Anting protected Player ${e.targetNumber} from an attack.`;
            case "kapitan_prevent": return `${actorText(e)} enforced a lockdown — all killings were prevented tonight.`;
            case "kapre_block": return `${actorText(e)} created a smoke cloud — investigations failed.`;
            case "investigate_success": return `${actorText(e)} investigated Player ${e.targetNumber}: ${e.result}.`;
            case "investigate_fail": return `${actorText(e)} attempted to investigate Player ${e.targetNumber} but it failed.`;
            case "reveal": return `${actorText(e)} revealed Player ${e.targetNumber}: ${e.result}.`;
            case "observe": return `${actorText(e)} observed Player ${e.targetNumber}: ${e.result}.`;
            case "haunt": return `${actorText(e)} haunted Player ${e.targetNumber} (paralyzed for the night).`;
            case "silence": return `${actorText(e)} silenced Player ${e.targetNumber}.`;
            case "revenge": return `Tiyanak (${e.targetName}) dragged down ${e.actorRole} (${e.actorName}) in revenge.`;
            case "revenge_vote": return `Tiyanak's dying revenge killed Player ${e.target} (${e.targetRole}).`;
            case "cancelAllAbilities": return `${actorText(e)} cancelled all human abilities tonight.`;
            case "skipDiscussion": return `${actorText(e)} rang their Bell to skip the discussion and proceed to voting.`;
            case "cancelled_action": return `${actorText(e)} had their action cancelled by Duwende.`;
            default: return e.text || "";
        }
    }

    // ==================== VOTING PHASE ====================
	function initVotingPhase() {
		const gameState = loadGameState();
		if (!gameState) {
			alert('No game found.');
			window.location.href = 'lobby.html';
			return;
		}

		document.getElementById('voteDayNum').textContent = gameState.dayNumber;
		
		const voteOptions = document.getElementById('voteOptions');
		
		// Sort players by number for voting display
		const sortedPlayers = gameState.players
			.filter(p => p.alive)
			.sort((a, b) => a.number - b.number);
		
		voteOptions.innerHTML = sortedPlayers
			.map(p => {
				const isCreature = isCreatureRole(p.role);
				const tag = isCreature ? 'creature' : 'human';
				return `
					<div class="vote-option" onclick="votePlayer(${p.number})">
						Player ${p.number} - ${p.role} 
						<span class="role-tag ${tag}">${isCreature ? 'CREATURE' : 'HUMAN'}</span>
					</div>
				`;
			}).join('');
	}

    window.votePlayer = function(playerNumber) {
        const gameState = loadGameState();
        if (!gameState) return;
        
        const player = findPlayerByNumber(gameState.players, playerNumber);
        if (!player) return;
        
        if (confirm(`Eliminate ${player.name}?`)) {
            player.alive = false;
            
            if (player.role.includes("Tiyanak")) {
                showRevealCard(`${player.name} (${player.role}) has been eliminated!`);
                const aliveTargets = gameState.players.filter(p => p.alive);
                if (aliveTargets.length > 0) {
                    let targetStr = aliveTargets.map(p => `Player ${p.number} - ${p.role}`).join("\n");
                    let choice = prompt(
                        `Tiyanak was eliminated!\nGM: Choose a player number for Tiyanak to kill:\n${targetStr}`
                    );
                    let chosen = parseInt(choice);
                    let target = findPlayerByNumber(gameState.players, chosen);
                    if (target && target.alive) {
                        target.alive = false;
                        showRevealCard(`Tiyanak's revenge! Player ${target.number} (${target.role}) was killed.`);
                        gameState.nightLog.push({
                            type: "revenge_vote",
                            target: target.number,
                            targetRole: target.role,
                            source: player.number
                        });
                    }
                }
            } else {
                showRevealCard(`${player.name} (${player.role}) has been eliminated!`);
            }
            
            saveGameState(gameState);
            checkWinConditions();
        }
    };

    window.endVoting = function() {
        const gameState = loadGameState();
        if (!gameState) return;
        saveGameState(gameState);
        checkWinConditions();
    };

    // ==================== WIN CONDITIONS ====================
    function checkWinConditions() {
        const gameState = loadGameState();
        if (!gameState) return;

        const aliveCreatures = gameState.players.filter(p => p.alive && isCreatureRole(p.role)).length;
        const aliveHumansWithAbility = gameState.players.filter(p => p.alive && !isCreatureRole(p.role) && p.role !== 'Tagabaryo').length;
        const aliveVillagers = gameState.players.filter(p => p.alive && p.role === 'Tagabaryo').length;

        if (aliveCreatures === 0) {
            showGameOver('Humans Win!', 'All mythical creatures have been eliminated!');
            return;
        }

        if (gameState.dayNumber >= gameState.maxDays && aliveCreatures > 0) {
            showGameOver('Creatures Win!', `The creatures survived ${gameState.maxDays} days!`);
            return;
        }

        if (aliveCreatures > (aliveHumansWithAbility + aliveVillagers)) {
            showGameOver('Creatures Win!', 'The mythical creatures outnumber the humans!');
            return;
        }

        gameState.dayNumber++; 
        gameState.currentPlayerIndex = 0;
        gameState.nightActions = [];
        gameState.nightLog = [];
        saveGameState(gameState);
        window.location.href = 'night.html';
    }

    function showGameOver(title, message) {
        const gameState = loadGameState();
        if (!gameState) return;

        gameState.winnerTitle = title;
        gameState.winnerMessage = message;
        saveGameState(gameState);
        window.location.href = 'gameover.html';
    }

    // ==================== GAME OVER PAGE ====================
    function initGameOverPage() {
        const gameState = loadGameState();
        if (!gameState) {
            document.getElementById('winnerTitle').textContent = 'Game Over';
            document.getElementById('winnerMessage').textContent = 'No game data found.';
            return;
        }

        document.getElementById('winnerTitle').textContent = gameState.winnerTitle || 'Game Over';
        document.getElementById('winnerMessage').textContent = gameState.winnerMessage || '';
        
        const finalRoster = document.getElementById('finalRoster');
        finalRoster.innerHTML = '<h3>Final Roster:</h3><ul class="player-list">' +
            gameState.players.map(p => {
                const isCreature = isCreatureRole(p.role);
                const tag = isCreature ? 'creature' : 'human';
                const status = p.alive ? '✓ ALIVE' : '✗ DEAD';
                return `<li class="${p.alive ? '' : 'eliminated'}">
                    ${p.name} - ${p.role} 
                    <span class="role-tag ${tag}">${isCreature ? 'CREATURE' : 'HUMAN'}</span>
                    ${status}
                </li>`;
            }).join('') + '</ul>';
    }

    // ==================== PAGE INITIALIZATION ====================
    document.addEventListener('DOMContentLoaded', function() {
        const path = window.location.pathname;
        const page = path.split('/').pop();

        if (page === 'night.html') {
            initNightPhase();
        } else if (page === 'day.html') {
            initDayPhase();
        } else if (page === 'voting.html') {
            initVotingPhase();
        } else if (page === 'gameover.html') {
            initGameOverPage();
        }
    });

    // =========TIMER & SKIP FUNCTIONALITY========= 
    let countdown;

    // FIXED: Skip timer function
    window.skipTimer = function() {
        if (countdown) {
            clearInterval(countdown);
        }
        window.location.href = "voting.html";
    };

    // Initialize timer on page load
    if (window.location.pathname.includes("Discussion.html")) {
        setTimeout(() => {
            startTimer(1);
        }, 100);
    }

    function startTimer(minutes) {
        let timeInSeconds = minutes * 60;

        countdown = setInterval(() => {
            let min = Math.floor(timeInSeconds / 60);
            let sec = timeInSeconds % 60;

            const timerEl = document.getElementById("timer");
            if (timerEl) {
                timerEl.textContent = `${min}:${sec < 10 ? "0" : ""}${sec}`;
            }

            timeInSeconds--;

            if (timeInSeconds < 0) {
                clearInterval(countdown);
                window.location.href = "voting.html";
            }
        }, 1000);
    }

    // BACKGROUND CHANGER
    function updateBackground() {
        const bgVideo = document.getElementById("bgVideo");
        if (!bgVideo) return;

        const gameState = loadGameState();
        if (!gameState) return;

        if (gameState.phase === "night") {
            bgVideo.src = "assets/Night_BG.mp4";
        } else {
            bgVideo.src = "assets/Day_BG.mp4";
        }

        bgVideo.load();
        bgVideo.play().catch(() => {
            console.warn("Autoplay blocked; user interaction may be needed.");
        });
    }

    // FIXED: Attach skip button handler
    document.addEventListener('DOMContentLoaded', function() {
        const skipBtn = document.getElementById("skip-btn");
        if (skipBtn) {
            skipBtn.addEventListener("click", window.skipTimer);
        }
    });

    // Expose necessary functions to window
    window.advancePhase = advancePhase;
})();
