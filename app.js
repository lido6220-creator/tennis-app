
const { useState, useEffect, useMemo } = React;
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
function loadLS(key, fallback){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v) : fallback; } catch { return fallback; } }
function saveLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function ensureSeed(){
  if (localStorage.getItem("__seeded__")) return;
  const profile = { displayName: "게스트", level: 3, playType: "D", region: "서울 강서구", radiusKm: 10, availability: "평일 저녁", blocked: [] };
  saveLS("profile", profile);
  const now = new Date();
  const addDays = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
  const matches = [
    { id: uid(), hostId: "seed1", hostName: "민수", region: "서울 강서구", address: "우장산테니스장 3코트", date: addDays(1).toISOString().slice(0,10), start: "19:00", end: "21:00", type: 'D', levelMin: 2, levelMax: 4, maxPlayers: 4, players: ["민수"], notes: "볼 준비됨", status: 'open', createdAt: Date.now() },
    { id: uid(), hostId: "seed2", hostName: "지현", region: "경기 고양시 일산서구", address: "종합운동장 B코트", date: addDays(2).toISOString().slice(0,10), start: "07:00", end: "09:00", type: 'S', levelMin: 3, levelMax: 5, maxPlayers: 2, players: ["지현"], notes: "아침 단식", status: 'open', createdAt: Date.now() },
    { id: uid(), hostId: "seed3", hostName: "태훈", region: "서울 송파구", address: "올림픽공원 5번", date: addDays(3).toISOString().slice(0,10), start: "20:00", end: "22:00", type: 'D', levelMin: 1, levelMax: 3, maxPlayers: 4, players: ["태훈"], notes: "초중급 환영", status: 'open', createdAt: Date.now() },
  ];
  saveLS("matches", matches);
  localStorage.setItem("__seeded__", "1");
}
ensureSeed();

function App(){
  const [tab, setTab] = useState("home");
  const [profile, setProfile] = useState(loadLS("profile", {displayName:"",level:3,playType:"D",region:"",radiusKm:10,availability:"평일 저녁",blocked:[]}));
  const [matches, setMatches] = useState(loadLS("matches", []));
  const [filters, setFilters] = useState({ date: todayISO(), region: "", type:"ALL" });
  const [interstitialOpen, setInterstitialOpen] = useState(false);
  const [justMadeMatchId, setJustMadeMatchId] = useState(null);

  useEffect(()=>{ saveLS("profile", profile); }, [profile]);
  useEffect(()=>{ saveLS("matches", matches); }, [matches]);

  useEffect(()=>{
    const ids = ["tab-home","tab-new","tab-mine","tab-profile"];
    ids.forEach(id => (document.getElementById(id)||{}).classList?.remove("active"));
    const current = document.getElementById(`tab-${tab.startsWith("match:")?"home":tab}`);
    if (current) current.classList.add("active");
    const ad = document.getElementById("ad-area");
    if (ad) ad.style.display = tab==="home" ? "block" : "none";
  }, [tab]);

  useEffect(()=>{
    document.getElementById("tab-home").onclick = () => setTab("home");
    document.getElementById("tab-new").onclick = () => setTab("new");
    document.getElementById("tab-mine").onclick = () => setTab("mine");
    document.getElementById("tab-profile").onclick = () => setTab("profile");
  }, []);

  const myName = (profile.displayName||"").trim() || "게스트";
  const visibleMatches = useMemo(()=>{
    return matches
      .filter(m => m.status === 'open')
      .filter(m => !filters.date || m.date === filters.date)
      .filter(m => !filters.region || m.region.includes(filters.region))
      .filter(m => (filters.type === 'ALL' ? true : m.type === filters.type))
      .filter(m => m.levelMin <= profile.level && profile.level <= m.levelMax)
      .sort((a,b) => (a.date + a.start).localeCompare(b.date + b.start));
  }, [matches, filters, profile.level]);

  function joinMatch(m){
    if (m.players.includes(myName)) return;
    if (m.players.length >= m.maxPlayers) { alert("정원이 가득 찼습니다."); return; }
    const updated = matches.map(x => x.id===m.id ? {...x, players:[...x.players, myName]} : x);
    setMatches(updated);
    alert("참여 요청이 승인되었습니다 (데모). 매치 상세에서 채팅해보세요.");
  }
  function leaveMatch(m){
    const updated = matches.map(x => x.id===m.id ? {...x, players:x.players.filter(p=>p!==myName)} : x);
    setMatches(updated);
  }

  return React.createElement(React.Fragment, null,
    tab==="home" && React.createElement(Home, {filters, setFilters, profile, matches:visibleMatches, onJoin:joinMatch, onOpen:(id)=>setTab(`match:${id}`)}),
    tab==="new" && React.createElement(NewMatch, {profile, onCreate:(m)=>{ setMatches([m, ...matches]); setJustMadeMatchId(m.id); setInterstitialOpen(true); }}),
    tab==="mine" && React.createElement(MyMatches, {profile, matches:matches.filter(m=>m.players.includes(myName) || m.hostName===myName), onOpen:(id)=>setTab(`match:${id}`)}),
    tab.startsWith("match:") && React.createElement(MatchDetail, {id:tab.split(":")[1], me:myName, matches, setMatches, onBack:()=>setTab("home"), onLeave:leaveMatch}),
    tab==="profile" && React.createElement(Profile, {profile, setProfile}),
    interstitialOpen && React.createElement(Interstitial, {onClose:()=>{ setInterstitialOpen(false); if (justMadeMatchId) setTab(`match:${justMadeMatchId}`); }})
  );
}

function SectionCard(props){
  return React.createElement("section", {className:"card", style:{marginBottom:12}}, props.children);
}
function Labeled({label, children}){
  return React.createElement("div", null,
    React.createElement("div", {className:"hint", style:{marginBottom:4}}, label),
    children
  );
}

function Home({filters, setFilters, profile, matches, onJoin, onOpen}){
  return React.createElement("div", {className:"list"},
    React.createElement(SectionCard, null,
      React.createElement("div", {className:"row"},
        React.createElement("div", {style:{flex:"1 1 120px"}}, React.createElement(Labeled, {label:"날짜"},
          React.createElement("input", {type:"date", className:"input", value:filters.date, onChange:(e)=>setFilters({...filters, date:e.target.value})})
        )),
        React.createElement("div", {style:{flex:"1 1 140px"}}, React.createElement(Labeled, {label:"지역(구/동)"},
          React.createElement("input", {type:"text", className:"input", placeholder:"예: 강서구", value:filters.region, onChange:(e)=>setFilters({...filters, region:e.target.value})})
        )),
        React.createElement("div", {style:{width:140}}, React.createElement(Labeled, {label:"유형"},
          React.createElement("select", {value:filters.type, onChange:(e)=>setFilters({...filters, type:e.target.value})},
            React.createElement("option", {value:"ALL"}, "전체"),
            React.createElement("option", {value:"S"}, "단식"),
            React.createElement("option", {value:"D"}, "복식")
          )
        )),
        React.createElement("div", {style:{width:200}},
          React.createElement(Labeled, {label:`내 레벨 (${profile.level})`},
            React.createElement("input", {type:"range", min:1, max:5, step:1, value:profile.level, onChange:(e)=>{ const p = {...profile, level:Number(e.target.value)}; saveLS('profile', p); location.reload(); }})
          ),
          React.createElement("div", {className:"hint"}, "(정확한 변경은 마이 탭)")
        )
      )
    ),
    matches.length===0 && React.createElement("div", {className:"card", style:{textAlign:"center"}}, "조건에 맞는 매치가 없습니다. 필터를 조정하거나 새 매치를 만들어보세요."),
    matches.map(m => React.createElement("article", {key:m.id, className:"card"},
      React.createElement("div", {className:"row", style:{fontSize:12,color:"#64748b"}},
        React.createElement("span", {className:"pill"}, m.type==='S' ? '단식' : '복식'),
        React.createElement("span", null, `레벨 ${m.levelMin}~${m.levelMax}`),
        React.createElement("span", null, `정원 ${m.maxPlayers} / 현재 ${m.players.length}`)
      ),
      React.createElement("div", {className:"row", style:{marginTop:4}},
        React.createElement("div", {style:{fontSize:18,fontWeight:700}}, `${m.region} · ${m.address}`)
      ),
      React.createElement("div", {style:{fontSize:14,color:"#475569"}}, `${m.date} ${m.start}~${m.end}`),
      m.notes ? React.createElement("div", {style:{fontSize:14,color:"#475569",marginTop:4}}, `메모: ${m.notes}`) : null,
      React.createElement("div", {className:"row", style:{marginTop:8}},
        React.createElement("button", {className:"btn ghost", onClick:()=>onOpen(m.id)}, "상세"),
        React.createElement("button", {className:"btn primary", onClick:()=>onJoin(m)}, "참여하기")
      )
    ))
  );
}

function NewMatch({profile, onCreate}){
  const [form, setForm] = useState({
    region: profile.region || "서울 강서구",
    address: "우장산테니스장",
    date: todayISO(),
    start: "19:00",
    end: "21:00",
    type: profile.playType || 'D',
    levelMin: Math.max(1, (profile.level||3)-1),
    levelMax: Math.min(5, (profile.level||3)+1),
    maxPlayers: 4,
    notes: ""
  });
  function submit(){
    if (!form.region || !form.address) return alert("지역과 코트를 입력해주세요");
    const m = {
      id: uid(),
      hostId: uid(),
      hostName: (profile.displayName || '게스트'),
      region: form.region,
      address: form.address,
      date: form.date,
      start: form.start,
      end: form.end,
      type: form.type,
      levelMin: Number(form.levelMin),
      levelMax: Number(form.levelMax),
      maxPlayers: Number(form.maxPlayers),
      players: [profile.displayName || '게스트'],
      notes: form.notes,
      status: 'open',
      createdAt: Date.now(),
    };
    onCreate(m);
  }
  return React.createElement("div", {className:"list"},
    React.createElement(SectionCard, null,
      React.createElement("div", {className:"row"},
        React.createElement("div", {style:{flex:"1 1 200px"}}, React.createElement(Labeled, {label:"지역(구/시)"},
          React.createElement("input", {className:"input", value:form.region, onChange:(e)=>setForm({...form, region:e.target.value})})
        )),
        React.createElement("div", {style:{flex:"1 1 200px"}}, React.createElement(Labeled, {label:"코트/주소"},
          React.createElement("input", {className:"input", value:form.address, onChange:(e)=>setForm({...form, address:e.target.value})})
        )),
        React.createElement("div", {style:{flex:"1 1 160px"}}, React.createElement(Labeled, {label:"날짜"},
          React.createElement("input", {type:"date", className:"input", value:form.date, onChange:(e)=>setForm({...form, date:e.target.value})})
        )),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,flex:"1 1 200px"}},
          React.createElement(Labeled, {label:"시작"}, React.createElement("input", {type:"time", className:"input", value:form.start, onChange:(e)=>setForm({...form, start:e.target.value})})),
          React.createElement(Labeled, {label:"종료"}, React.createElement("input", {type:"time", className:"input", value:form.end, onChange:(e)=>setForm({...form, end:e.target.value})}))
        ),
        React.createElement("div", {style:{width:140}}, React.createElement(Labeled, {label:"유형"},
          React.createElement("select", {value:form.type, onChange:(e)=>setForm({...form, type:e.target.value})},
            React.createElement("option", {value:"S"}, "단식"),
            React.createElement("option", {value:"D"}, "복식")
          )
        )),
        React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,flex:"1 1 200px"}},
          React.createElement(Labeled, {label:"레벨 최소(1~5)"}, React.createElement("input", {type:"number", className:"input", value:form.levelMin, onChange:(e)=>setForm({...form, levelMin:e.target.value})})),
          React.createElement(Labeled, {label:"레벨 최대(1~5)"}, React.createElement("input", {type:"number", className:"input", value:form.levelMax, onChange:(e)=>setForm({...form, levelMax:e.target.value})}))
        ),
        React.createElement("div", {style:{width:140}},
          React.createElement(Labeled, {label:"정원"}, React.createElement("input", {type:"number", className:"input", value:form.maxPlayers, onChange:(e)=>setForm({...form, maxPlayers:e.target.value})}))
        ),
        React.createElement("div", {style:{flex:"1 1 100%"}}, React.createElement(Labeled, {label:"메모(선택)"},
          React.createElement("textarea", {className:"input", rows:3, value:form.notes, onChange:(e)=>setForm({...form, notes:e.target.value})})
        ))
      ),
      React.createElement("button", {className:"btn primary", style:{width:"100%",marginTop:8}, onClick:submit}, "생성하고 완료"),
      React.createElement("div", {className:"hint", style:{marginTop:6}}, "생성 직후 전면 광고 1회 노출(데모). 출시 시 AdMob 전면 광고로 교체됩니다.")
    )
  );
}

function MyMatches({profile, matches, onOpen}){
  return React.createElement("div", {className:"list"},
    matches.length===0 && React.createElement("div", {className:"card", style:{textAlign:"center"}}, "내가 참여/생성한 매치가 없습니다."),
    matches.map(m => React.createElement("article", {key:m.id, className:"card"},
      React.createElement("div", {className:"row", style:{fontSize:12,color:"#64748b"}},
        React.createElement("span", {className:"pill"}, m.type==='S'?'단식':'복식'),
        React.createElement("span", null, `레벨 ${m.levelMin}~${m.levelMax}`),
        React.createElement("span", null, `정원 ${m.maxPlayers} / 현재 ${m.players.length}`)
      ),
      React.createElement("div", {style:{fontSize:18,fontWeight:700,marginTop:4}}, `${m.region} · ${m.address}`),
      React.createElement("div", {style:{fontSize:14,color:"#475569"}}, `${m.date} ${m.start}~${m.end}`),
      React.createElement("div", {style:{marginTop:8}},
        React.createElement("button", {className:"btn ghost", onClick:()=>onOpen(m.id)}, "상세/채팅")
      )
    ))
  );
}

function MatchDetail({id, me, matches, setMatches, onBack, onLeave}){
  const m = matches.find(x=>x.id===id);
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState(loadLS(`chat:${id}`, []));
  useEffect(()=>{ saveLS(`chat:${id}`, msgs); }, [id, msgs]);
  if (!m) return React.createElement("div", {className:"hint"}, "매치를 찾을 수 없습니다.");
  function send(){
    const trimmed = msg.trim();
    if (!trimmed) return;
    const item = { id: uid(), user: me, text: trimmed, ts: Date.now() };
    setMsgs([...msgs, item]); setMsg("");
  }
  function closeMatch(){ setMatches(matches.map(x=> x.id===m.id ? {...x, status:'closed'} : x)); }
  return React.createElement("div", {className:"list"},
    React.createElement("button", {className:"btn ghost", onClick:onBack}, "← 목록으로"),
    React.createElement(SectionCard, null,
      React.createElement("div", {className:"row", style:{fontSize:12,color:"#64748b"}},
        React.createElement("span", {className:"pill"}, m.type==='S'?'단식':'복식'),
        React.createElement("span", null, `레벨 ${m.levelMin}~${m.levelMax}`),
        React.createElement("span", null, `정원 ${m.maxPlayers} / 현재 ${m.players.length}`),
        React.createElement("span", {className:"badge", style:{marginLeft:"auto", opacity:m.status==='open'?1:.6}}, m.status)
      ),
      React.createElement("div", {style:{fontSize:18,fontWeight:700}}, `${m.region} · ${m.address}`),
      React.createElement("div", {style:{fontSize:14,color:"#475569"}}, `${m.date} ${m.start}~${m.end}`),
      m.notes ? React.createElement("div", {style:{fontSize:14,color:"#475569"}}, `메모: ${m.notes}`) : null,
      React.createElement("div", {style:{fontSize:14}}, `참가자: ${m.players.join(', ')}`),
      React.createElement("div", {className:"row", style:{marginTop:8}},
        React.createElement("button", {className:"btn ghost", onClick:()=>onLeave(m)}, "나가기"),
        React.createElement("button", {className:"btn primary", onClick:closeMatch}, "매치 마감")
      )
    ),
    React.createElement(SectionCard, null,
      React.createElement("div", {style:{fontWeight:600, marginBottom:8}}, "그룹 채팅(데모)"),
      React.createElement("div", {className:"chat"},
        msgs.length===0 ? React.createElement("div", {className:"hint"}, "첫 메시지를 남겨보세요.") :
        msgs.map(item => React.createElement("div", {key:item.id, style:{fontSize:14, marginBottom:6}},
          React.createElement("span", {style:{fontWeight:600}}, item.user),
          React.createElement("span", {className:"hint", style:{marginLeft:6}}, new Date(item.ts).toLocaleString()),
          React.createElement("div", null, item.text)
        ))
      ),
      React.createElement("div", {className:"row", style:{marginTop:8}},
        React.createElement("input", {className:"input", style:{flex:1}, value:msg, onChange:(e)=>setMsg(e.target.value), placeholder:"메시지 입력", onKeyDown:(e)=>{ if(e.key==='Enter') send(); }}),
        React.createElement("button", {className:"btn primary", onClick:send}, "전송")
      )
    ),
    React.createElement("div", {className:"hint"}, "* 개인정보 보호: 이 MVP는 기기 로컬스토리지만 사용합니다. 브라우저/기기 변경 시 데이터가 동기화되지 않습니다.")
  );
}

function Profile({profile, setProfile}){
  const [p, setP] = useState(profile);
  function save(){ setProfile(p); alert("프로필 저장됨"); }
  function resetAll(){ if (!confirm("모든 데이터를 초기화할까요?")) return; localStorage.clear(); location.reload(); }
  return React.createElement("div", {className:"list"},
    React.createElement(SectionCard, null,
      React.createElement("div", {style:{fontWeight:600, marginBottom:8}}, "내 프로필"),
      React.createElement("div", {className:"row"},
        React.createElement("div", {style:{flex:"1 1 200px"}}, React.createElement(Labeled, {label:"닉네임"},
          React.createElement("input", {className:"input", value:p.displayName, onChange:(e)=>setP({...p, displayName:e.target.value})})
        )),
        React.createElement("div", {style:{width:260}}, React.createElement(Labeled, {label:"레벨 (1~5)"},
          React.createElement("input", {type:"range", min:1, max:5, step:1, className:"input", value:p.level, onChange:(e)=>setP({...p, level:Number(e.target.value)})}),
        ), React.createElement("div", {className:"hint"}, `현재: ${p.level}`)),
        React.createElement("div", {style:{width:160}}, React.createElement(Labeled, {label:"유형"},
          React.createElement("select", {className:"input", value:p.playType, onChange:(e)=>setP({...p, playType:e.target.value})},
            React.createElement("option", {value:"S"}, "단식"),
            React.createElement("option", {value:"D"}, "복식")
          )
        )),
        React.createElement("div", {style:{flex:"1 1 200px"}}, React.createElement(Labeled, {label:"주 활동지역(구/시)"},
          React.createElement("input", {className:"input", value:p.region, onChange:(e)=>setP({...p, region:e.target.value})})
        )),
        React.createElement("div", {style:{flex:"1 1 200px"}}, React.createElement(Labeled, {label:"가용 시간대"},
          React.createElement("input", {className:"input", value:p.availability, onChange:(e)=>setP({...p, availability:e.target.value})})
        ))
      ),
      React.createElement("div", {className:"row", style:{marginTop:8}},
        React.createElement("button", {className:"btn primary", onClick:save}, "저장"),
        React.createElement("button", {className:"btn ghost", onClick:resetAll}, "전체 초기화")
      )
    ),
    React.createElement(SectionCard, null,
      React.createElement("div", {style:{fontWeight:600, marginBottom:8}}, "운영 정책(요약)"),
      React.createElement("ul", null,
        React.createElement("li", null, "신고/차단 기능은 다음 버전에 추가됩니다."),
        React.createElement("li", null, "광고는 리스트 하단 배너 1개 + 생성/참여 직후 전면 1회만 노출합니다."),
        React.createElement("li", null, "정확한 위치는 매치 확정 후에만 공유하도록 권장합니다.")
      )
    )
  );
}

function Interstitial({onClose}){
  return React.createElement("div", {style:{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",zIndex:50}},
    React.createElement("div", {className:"card", style:{maxWidth:420,width:"100%"}},
      React.createElement("div", {className:"hint"}, "전면 광고(데모)"),
      React.createElement("div", {style:{aspectRatio:"16/9",width:"100%",background:"#f1f5f9",border:"1px solid #cbd5e1",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b"}}, "광고 영역"),
      React.createElement("button", {className:"btn primary", style:{width:"100%",marginTop:8}, onClick:onClose}, "닫고 매치로 이동")
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
