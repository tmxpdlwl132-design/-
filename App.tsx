
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monster, Item, CustomImages, CustomNames } from './types';
import { 
  MONSTER_POOL, 
  ITEM_POOL, 
  IDLE_THRESHOLD, 
  HEAL_AMOUNT, 
  SHIELD_DURATION, 
  SHIELD_COOLDOWN 
} from './constants';

const App: React.FC = () => {
  // Persistence & Settings
  const [customImages, setCustomImages] = useState<CustomImages>(() => {
    const saved = localStorage.getItem('typing-dungeon-images');
    return saved ? JSON.parse(saved) : {};
  });
  const [customNames, setCustomNames] = useState<CustomNames>(() => {
    const saved = localStorage.getItem('typing-dungeon-names');
    return saved ? JSON.parse(saved) : {};
  });
  const [autoStart, setAutoStart] = useState(() => localStorage.getItem('typing-dungeon-autostart') === 'true');
  const [themeHue, setThemeHue] = useState(() => Number(localStorage.getItem('typing-dungeon-hue')) || 300);
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Hero State
  const [heroLevel, setHeroLevel] = useState(1);
  const [heroExp, setHeroExp] = useState(0);
  const heroImage = customImages['hero'] || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero';
  
  // Game State
  const [monster, setMonster] = useState<Monster>(MONSTER_POOL[0]);
  const [currentHp, setCurrentHp] = useState(MONSTER_POOL[0].maxHp);
  const [inventory, setInventory] = useState<Item[]>([]);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [comboStartTime, setComboStartTime] = useState<number | null>(null);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [lastShieldTime, setLastShieldTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showLoot, setShowLoot] = useState<Item | null>(null);
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);

  // Refs
  const lastInputTime = useRef<number>(Date.now());
  const comboRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentEditingId = useRef<string | null>(null);

  const getNextLevelExp = (lvl: number) => Math.floor(100 * Math.pow(lvl, 1.5));

  const getMonsterLevel = (hp: number) => {
    if (hp <= 500) return 1;
    if (hp <= 1500) return 2;
    if (hp <= 3000) return 3;
    if (hp <= 5000) return 4;
    return 5;
  };

  const spawnMonster = useCallback((customHp?: number) => {
    const randomIdx = Math.floor(Math.random() * MONSTER_POOL.length);
    const base = MONSTER_POOL[randomIdx];
    const targetHp = customHp || base.maxHp;
    const newMonster = { ...base, maxHp: targetHp, level: getMonsterLevel(targetHp) };
    setMonster(newMonster);
    setCurrentHp(newMonster.maxHp);
    setIsIdle(true);
    setComboStartTime(null);
  }, []);

  const dropLoot = useCallback(() => {
    if (Math.random() > 0.3) {
      const item = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      setInventory(prev => [...prev.slice(-7), item]);
      setShowLoot(item);
      setTimeout(() => setShowLoot(null), 2000);
    }
  }, []);

  const addHeroExp = useCallback((amount: number) => {
    setHeroExp(prev => {
      const nextExp = prev + amount;
      let currentLvl = heroLevel;
      let finalExp = nextExp;
      
      while (finalExp >= getNextLevelExp(currentLvl)) {
        finalExp -= getNextLevelExp(currentLvl);
        currentLvl++;
      }
      
      if (currentLvl !== heroLevel) setHeroLevel(currentLvl);
      return finalExp;
    });
  }, [heroLevel]);

  const handleInput = useCallback((key: string) => {
    if (showSettings || isMinimized) return;
    const now = Date.now();
    lastInputTime.current = now;
    setIsIdle(false);
    setTotalCharsTyped(prev => prev + 1);

    if (!comboRef.current) {
      setComboStartTime(now);
      comboRef.current = now;
    }

    let damage = 1;
    let comboBonus = 1.0;
    const duration = (now - (comboRef.current || now)) / 1000;
    if (duration > 60) comboBonus = 1.5;
    else if (duration > 30) comboBonus = 1.25;
    else if (duration > 10) comboBonus = 1.1;

    if (['.', '!', '?'].includes(key)) damage += 10;
    if (key === 'Enter') damage += 30;

    const totalDamage = Math.floor(damage * comboBonus);

    setCurrentHp(prev => {
      const newHp = prev - totalDamage;
      if (newHp <= 0) {
        dropLoot();
        addHeroExp(Math.floor(monster.maxHp / 10));
        spawnMonster();
        return 0;
      }
      return newHp;
    });
  }, [monster, spawnMonster, dropLoot, addHeroExp, showSettings, isMinimized]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      handleInput(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastInputTime.current;
      
      const timeSinceLastShield = now - lastShieldTime;
      if (timeSinceLastShield < SHIELD_COOLDOWN) {
        setCooldownRemaining(Math.ceil((SHIELD_COOLDOWN - timeSinceLastShield) / 1000));
      } else {
        setCooldownRemaining(0);
      }

      if (idleTime > IDLE_THRESHOLD) {
        setIsIdle(true);
        setComboStartTime(null);
        comboRef.current = null;
      }
      if (idleTime > IDLE_THRESHOLD && !isShieldActive && currentHp < monster.maxHp) {
        setCurrentHp(prev => Math.min(monster.maxHp, prev + Math.floor(HEAL_AMOUNT / 10)));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentHp, monster.maxHp, isShieldActive, lastShieldTime]);

  useEffect(() => {
    localStorage.setItem('typing-dungeon-images', JSON.stringify(customImages));
    localStorage.setItem('typing-dungeon-names', JSON.stringify(customNames));
    localStorage.setItem('typing-dungeon-autostart', String(autoStart));
    localStorage.setItem('typing-dungeon-hue', String(themeHue));

    // Update dynamic colors
    const primary = `hsl(${themeHue}, 100%, 50%)`;
    const secondary = `hsl(${(themeHue + 180) % 360}, 100%, 60%)`;
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
  }, [customImages, customNames, autoStart, themeHue]);

  const activateShield = () => {
    const now = Date.now();
    if (now - lastShieldTime >= SHIELD_COOLDOWN) {
      setIsShieldActive(true);
      setLastShieldTime(now);
      setTimeout(() => setIsShieldActive(false), SHIELD_DURATION);
    }
  };

  const currentComboMult = (() => {
    if (!comboStartTime) return 1.0;
    const duration = (Date.now() - comboStartTime) / 1000;
    if (duration > 60) return 1.5;
    if (duration > 30) return 1.25;
    if (duration > 10) return 1.1;
    return 1.0;
  })();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentEditingId.current) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImages(prev => ({
          ...prev,
          [currentEditingId.current!]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = (id: string) => {
    currentEditingId.current = id;
    fileInputRef.current?.click();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[999]">
        <button onClick={() => setIsMinimized(false)} className="cyber-window p-3 flex items-center gap-3 hover:scale-105 transition-transform">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00ffff]"></div>
          <span className="pixel-font text-cyan-400 text-xs font-bold uppercase tracking-widest">던전 활성 중</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 flex flex-col items-center select-none">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {/* Main consolidated Window */}
      <div className="cyber-window w-full max-w-[380px] flex flex-col">
        
        {/* Cyber Title Bar */}
        <div className="cyber-title-bar px-3 py-2 flex justify-between items-center z-[60]">
          <div className="flex items-center gap-2">
            <span className="text-[14px] animate-pulse">✧</span>
            <span className="pixel-font text-[10px] font-bold tracking-widest uppercase">타이핑-던전.시스템</span>
          </div>
          <div className="flex gap-2.5">
             <button onClick={() => setShowSettings(!showSettings)} className="hover:text-white transition-colors">
                <span className="text-[12px]">⚙</span>
             </button>
             <button onClick={() => setIsPinned(!isPinned)} className={`transition-colors ${isPinned ? 'text-white' : ''}`}>
                <span className="text-[12px]">{isPinned ? '★' : '☆'}</span>
             </button>
             <button onClick={() => setIsMinimized(true)} className="hover:text-white transition-colors">
                <span className="text-[12px]">−</span>
             </button>
             <button onClick={() => window.close()} className="hover:text-red-500 transition-colors">
                <span className="text-[12px]">×</span>
             </button>
          </div>
        </div>

        {/* CRT AREA */}
        <div className="crt-container w-full aspect-[0.9] relative z-10 border-l-0 border-r-0 border-t-0 border-b-2 border-b-white/5">
          <div className="crt-screen">
            <div className="crt-overlay"></div>
            <div className="crt-flicker"></div>
            
            {/* Hero Stats */}
            <div className="absolute top-0 left-0 right-0 p-3 z-40 bg-black/50 border-b border-white/5 flex items-center gap-3 backdrop-blur-md">
               <button onClick={() => triggerFileUpload('hero')} className="w-10 h-10 border border-white/20 rounded overflow-hidden flex-shrink-0 bg-slate-800 relative group">
                  <img src={heroImage} className="w-full h-full object-cover" alt="용사" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[7px] text-white uppercase">수정</div>
               </button>
               <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <span className="pixel-font font-bold text-[10px] uppercase tracking-tighter" style={{ color: 'var(--primary-color)' }}>용사 Lv.{heroLevel}</span>
                    <span className="pixel-font text-slate-500 text-[7px] uppercase tracking-tighter">경험치 {Math.floor((heroExp / getNextLevelExp(heroLevel)) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                     <div className="h-full transition-all duration-300 shadow-[0_0_5px_var(--primary-color)]" style={{ width: `${(heroExp / getNextLevelExp(heroLevel)) * 100}%`, backgroundColor: 'var(--primary-color)' }}></div>
                  </div>
               </div>
            </div>

            {/* Monster Label */}
            <div className="absolute top-24 left-4 z-40 flex flex-col items-start gap-1">
              <div className="pixel-font text-[10px] opacity-90 drop-shadow-[0_0_3px_var(--primary-color)] leading-none uppercase font-bold" style={{ color: 'var(--primary-color)' }}>
                Lv.{monster.level} {customNames[monster.id] || monster.name}
              </div>
            </div>

            {/* Skill Buttons (Outer glow handled by cyber-window class) */}
            <div className="absolute right-4 top-24 z-50 flex flex-col gap-3">
              <button 
                onClick={activateShield}
                disabled={cooldownRemaining > 0}
                className={`w-12 h-12 cyber-window bg-black/60 flex items-center justify-center transition-all ${cooldownRemaining > 0 ? 'opacity-30' : 'hover:scale-110 hover:bg-black/80'}`}
                style={{ borderColor: 'var(--secondary-color)', boxShadow: '0 0 10px var(--secondary-color)' }}
              >
                <div className="flex flex-col items-center justify-center">
                  <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=shield&backgroundColor=transparent&primaryColor=3b82f6" className="w-7 h-7" alt="방패" />
                  {cooldownRemaining > 0 && <span className="pixel-font text-[7px] text-white leading-none absolute bottom-1">{cooldownRemaining}초</span>}
                </div>
              </button>
              <button 
                onClick={() => spawnMonster()}
                className="w-12 h-12 cyber-window bg-black/60 flex items-center justify-center transition-all hover:scale-110 hover:bg-black/80"
                style={{ borderColor: 'var(--primary-color)', boxShadow: '0 0 10px var(--primary-color)' }}
              >
                <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=refresh&backgroundColor=transparent&primaryColor=f472b6" className="w-7 h-7" alt="리셋" />
              </button>
            </div>

            {!isIdle && comboStartTime && (
              <div className="absolute top-40 right-4 z-40 animate-pulse">
                <span className="pixel-font text-orange-400 text-[8px] drop-shadow-[0_0_5px_rgba(251,146,60,0.8)] font-bold">
                  콤보 X{currentComboMult.toFixed(1)}
                </span>
              </div>
            )}

            {isShieldActive && (
              <div className="absolute inset-0 z-20 bg-blue-500/10 border-[10px] border-blue-400/20 pointer-events-none animate-pulse"></div>
            )}

            {/* Monster Sprite */}
            <div className={`relative z-20 w-32 h-32 flex items-center justify-center mt-12 ${!isIdle ? 'animate-shake' : 'animate-float'}`}>
              <img 
                src={customImages[monster.id] || monster.image} 
                className="w-full h-full object-contain monster-glow" 
                alt="몬스터" 
              />
            </div>

            <div className="pixel-floor"></div>

            {/* HP Text */}
            <div className="absolute bottom-20 left-0 right-0 z-40 flex justify-center">
              <span className="pixel-font text-[11px] font-bold drop-shadow-[0_0_5px_var(--primary-color)] uppercase bg-black/40 px-3 py-1 rounded" style={{ color: 'var(--primary-color)' }}>
                HP {currentHp} / {monster.maxHp}
              </span>
            </div>
          </div>
        </div>

        {/* WINDOW BODY: STATS AND BUTTONS (Changed to text-only as requested) */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 px-1">
            <div className="flex flex-col items-start justify-center">
              <span className="pixel-font text-[8px] opacity-70 uppercase tracking-widest font-bold" style={{ color: 'var(--secondary-color)' }}>» 입력 모드</span>
              <span className={`pixel-font text-[12px] font-bold uppercase tracking-tight mt-0.5 ${isIdle ? 'text-red-500/80' : 'animate-pulse'}`} style={{ color: isIdle ? undefined : 'var(--secondary-color)' }}>
                {isIdle ? '× 대기 중' : '√ 작동 중'}
              </span>
            </div>
            <div className="flex flex-col items-start justify-center">
              <span className="pixel-font text-[8px] opacity-70 uppercase tracking-widest font-bold" style={{ color: 'var(--secondary-color)' }}>» 누적 데이터</span>
              <span className="pixel-font text-[12px] font-bold text-white/90 uppercase tracking-tight mt-0.5">{totalCharsTyped.toLocaleString()} <span className="text-[8px] opacity-60 font-normal" style={{ color: 'var(--secondary-color)' }}>글자</span></span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
             {[500, 1500, 3000, 5000, 10000].map(hp => (
               <button key={hp} onClick={() => spawnMonster(hp)} className="cyber-btn px-3 py-1.5 text-[8px] font-bold tracking-tighter uppercase">
                 [{hp} HP]
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Settings Modal (Overlay) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="cyber-window w-full max-w-[340px] p-0 shadow-2xl" style={{ borderColor: 'var(--secondary-color)', boxShadow: '0 0 20px var(--secondary-color)' }} onClick={e => e.stopPropagation()}>
             <div className="cyber-title-bar px-4 py-2 flex justify-between items-center" style={{ background: 'linear-gradient(90deg, var(--secondary-color) 0%, #fff 100%)' }}>
                <h3 className="pixel-font font-bold text-[10px] uppercase tracking-widest text-black">시스템_설정.시스템</h3>
                <button onClick={() => setShowSettings(false)} className="hover:text-white transition-colors text-black text-xl leading-none">×</button>
             </div>
             
             <div className="p-4 space-y-5 max-h-[480px] overflow-y-auto no-scrollbar">
                {/* Auto Start Toggle */}
                <div className="p-3 border-l-4 border-white/10 bg-white/5 rounded-r-lg">
                  <div className="flex justify-between items-center">
                      <span className="pixel-font text-[9px] text-cyan-400 font-bold uppercase">컴퓨터 시작 시 자동 실행</span>
                      <button 
                        onClick={() => setAutoStart(!autoStart)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${autoStart ? 'bg-cyan-600' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-[0_0_5px_#fff] transition-all duration-200 ${autoStart ? 'left-6' : 'left-1'}`}></div>
                      </button>
                  </div>
                </div>

                {/* Theme Color UI */}
                <div className="space-y-2">
                    <h4 className="pixel-font text-[9px] text-cyan-400 font-bold uppercase tracking-widest">테마 색상 설정</h4>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                        <input 
                            type="range" 
                            min="0" 
                            max="360" 
                            value={themeHue} 
                            onChange={(e) => setThemeHue(Number(e.target.value))}
                            className="theme-slider"
                        />
                        <div className="flex justify-between mt-1 px-1">
                            <span className="text-[7px] text-white/40 uppercase">HUE</span>
                            <span className="text-[7px] font-bold" style={{ color: 'var(--primary-color)' }}>{themeHue}°</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                  <h4 className="pixel-font text-[9px] text-pink-500 font-bold uppercase tracking-widest border-b border-pink-500/30 pb-1">개체 커스터마이징</h4>
                  <div className="space-y-2">
                    <div className="flex gap-3 items-center bg-white/5 p-2 rounded border border-white/5">
                      <button onClick={() => triggerFileUpload('hero')} className="w-10 h-10 border border-cyan-400/30 rounded overflow-hidden flex-shrink-0 bg-slate-900 group relative">
                         <img src={heroImage} className="w-full h-full object-cover" alt="용사" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[6px] text-white">변경</div>
                      </button>
                      <span className="pixel-font text-[8px] text-white opacity-70 uppercase">용사 유닛</span>
                    </div>
                    {MONSTER_POOL.map(m => (
                      <div key={m.id} className="flex gap-3 items-center bg-white/5 p-2 rounded border border-white/5">
                        <button onClick={() => triggerFileUpload(m.id)} className="w-10 h-10 border border-pink-500/30 rounded overflow-hidden flex-shrink-0 bg-slate-900 group relative">
                          <img src={customImages[m.id] || m.image} className="w-full h-full object-cover" alt="몬스터" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[6px] text-white">변경</div>
                        </button>
                        <input 
                          type="text" 
                          placeholder="개체명 입력..."
                          className="flex-1 bg-transparent border-b border-white/10 text-[9px] text-white outline-none focus:border-cyan-400 py-1"
                          value={customNames[m.id] || ''}
                          onChange={(e) => setCustomNames({...customNames, [m.id]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full cyber-btn py-2 text-[10px] font-bold uppercase mt-2 border-cyan-400 text-cyan-400"
                >
                  설정 완료
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Item Notification */}
      {showLoot && (
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
           <div className="cyber-window p-4 animate-bounce flex flex-col items-center bg-black/95">
              <span className="text-4xl mb-1 drop-shadow-[0_0_10px_var(--primary-color)]">{showLoot.icon}</span>
              <p className="pixel-font text-[8px] font-bold text-cyan-400 uppercase tracking-[0.3em]">새로운 전리품 획득!</p>
              <p className="pixel-font text-[12px] font-bold text-white uppercase mt-1">{showLoot.name}</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
