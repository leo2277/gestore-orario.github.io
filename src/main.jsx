import React, { useEffect, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { CalendarDays, ChevronLeft, ChevronRight, Download, FileUp, MapPin, MoreHorizontal, Plus, Settings2, Sparkles, X } from 'https://esm.sh/lucide-react@0.468.0?external=react';

const DAYS = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì'];
const SHORT = ['LUN','MAR','MER','GIO','VEN'];
const TIMES = ['08:00','09:00','10:00','11:00','12:00','13:00'];
const initialLessons = [
  {id:1, day:0, slot:0, subject:'Italiano', teacher:'Prof.ssa Bianchi', room:'Aula 12', color:'coral', topic:'Il Romanticismo italiano'},
  {id:2, day:0, slot:1, subject:'Matematica', teacher:'Prof. Rossi', room:'Aula 8', color:'blue', topic:'Funzioni e grafici'},
  {id:3, day:0, slot:3, subject:'Storia', teacher:'Prof. Verdi', room:'Aula 12', color:'yellow', topic:'La rivoluzione industriale'},
  {id:4, day:1, slot:0, subject:'Inglese', teacher:'Prof.ssa Smith', room:'Lab. linguistico', color:'lavender', topic:'Speaking practice'},
  {id:5, day:1, slot:2, subject:'Fisica', teacher:'Prof. Neri', room:'Lab. fisica', color:'mint', topic:'Moto uniformemente accelerato'},
  {id:6, day:2, slot:1, subject:'Scienze', teacher:'Prof.ssa Gialli', room:'Aula 12', color:'green', topic:'La cellula eucariote'},
  {id:7, day:2, slot:3, subject:'Matematica', teacher:'Prof. Rossi', room:'Aula 8', color:'blue', topic:'Funzioni e grafici'},
  {id:8, day:3, slot:0, subject:'Filosofia', teacher:'Prof. Bruno', room:'Aula 12', color:'rose', topic:'Kant — critica della ragion pura'},
  {id:9, day:3, slot:2, subject:'Italiano', teacher:'Prof.ssa Bianchi', room:'Aula 12', color:'coral', topic:'Analisi del testo'},
  {id:10, day:4, slot:0, subject:'Educazione fisica', teacher:'Prof. Conti', room:'Palestra', color:'orange', topic:'Atletica leggera'},
  {id:11, day:4, slot:2, subject:'Storia dell’arte', teacher:'Prof.ssa Riva', room:'Aula arte', color:'peach', topic:'Il Rinascimento'},
];
const today = new Date().getDay();

function App(){
 const [lessons,setLessons] = useState(()=>JSON.parse(localStorage.getItem('lessons')||'null') || initialLessons);
 const [active,setActive] = useState(today >= 1 && today <=5 ? today-1 : 0);
 const [modal,setModal] = useState(null);
 const [importText,setImportText] = useState('');
 useEffect(()=>localStorage.setItem('lessons',JSON.stringify(lessons)),[lessons]);
 const activeLessons=lessons.filter(l=>l.day===active).sort((a,b)=>a.slot-b.slot);
 const next=activeLessons.find(l=>l.slot>=1)||activeLessons[0];
 const openAdd=(day=active,slot=0)=>setModal({type:'add', data:{day,slot,subject:'',teacher:'',room:'',topic:'',color:'blue'}});
 const saveLesson=(e)=>{e.preventDefault(); const d=Object.fromEntries(new FormData(e.currentTarget)); const item={...modal.data,...d,day:+d.day,slot:+d.slot,id:modal.data.id||Date.now()}; setLessons(prev=>[...prev.filter(l=>l.id!==item.id),item]); setModal(null)};
 const importSchedule=()=>{ const rows=importText.split('\n').map(x=>x.trim()).filter(Boolean); const parsed=rows.map((r,i)=>{const [day='Lunedì',time='08:00',subject='Materia',teacher='',room='',topic='']=r.split(/[;,|]/).map(v=>v.trim()); return {id:Date.now()+i,day:Math.max(0,DAYS.findIndex(d=>d.toLowerCase()===day.toLowerCase())),slot:Math.max(0,TIMES.indexOf(time)),subject,teacher,room,topic,color:['blue','coral','mint','lavender','yellow'][i%5]}}); if(parsed.length) setLessons(p=>[...p,...parsed]); setModal(null); setImportText('') };
 return <main>
  <header><div className="brand"><span className="brand-mark">o</span><span>orario</span></div><nav><button className="nav-active">La mia settimana</button><button>Materie</button><button>Archivio</button></nav><div className="profile"><button className="icon-btn"><Settings2 size={18}/></button><div className="avatar">AM</div><div><b>Andrea M.</b><small>5ª A · Scientifico</small></div></div></header>
  <section className="intro"><div><p className="eyebrow">VENERDÌ, 12 SETTEMBRE</p><h1>Buongiorno, Andrea.</h1><p className="sub">Ecco come si presenta la tua settimana.</p></div><div className="actions"><button className="secondary" onClick={()=>setModal({type:'import'})}><FileUp size={17}/> Importa orario</button><button className="primary" onClick={()=>openAdd()}><Plus size={18}/> Aggiungi lezione</button></div></section>
  <section className="week-switcher"><button className="chev"><ChevronLeft size={20}/></button><div className="week-title"><CalendarDays size={18}/><span>Settimana corrente</span><b>8 — 12 settembre 2025</b></div><button className="chev"><ChevronRight size={20}/></button><button className="today" onClick={()=>setActive(today>=1&&today<=5?today-1:0)}>Oggi</button></section>
  <section className="schedule"><aside><div className="time-head">ORARIO</div>{TIMES.map((time,i)=><div className="time" key={time}><span>{time}</span><small>{String(+time.slice(0,2)+1).padStart(2,'0')}:00</small></div>)}</aside><div className="grid-wrap"><div className="days">{DAYS.map((day,i)=><button onClick={()=>setActive(i)} className={i===active?'day selected':'day'} key={day}><span>{SHORT[i]}</span><b>{8+i}</b></button>)}</div><div className="grid">{DAYS.map((day,d)=><div className="day-col" key={day}>{TIMES.map((_,s)=>{const item=lessons.find(l=>l.day===d&&l.slot===s);return <div className="cell" key={s}>{item ? <article onClick={()=>setModal({type:'edit',data:item})} className={'lesson '+item.color}><div className="lesson-top"><strong>{item.subject}</strong><MoreHorizontal size={16}/></div><span>{item.teacher}</span><span className="room"><MapPin size={12}/>{item.room}</span>{item.topic&&<em>{item.topic}</em>}</article>:<button aria-label="Aggiungi lezione" onClick={()=>openAdd(d,s)} className="empty"><Plus size={15}/></button>}</div>})}</div>)}</div></div></section>
  <section className="bottom"><div className="today-card"><div><p className="eyebrow">PROSSIMA LEZIONE</p><h2>{next?.subject || 'Nessuna lezione'}</h2>{next&&<p>{TIMES[next.slot]} — {String(+TIMES[next.slot].slice(0,2)+1).padStart(2,'0')}:00 · {next.room}</p>}</div><span className={'dot '+(next?.color||'blue')}></span></div><div className="tip"><Sparkles size={18}/><span><b>In ordine, senza fatica.</b> Tocca una lezione per aggiornare argomento, docente o aula.</span></div></section>
  {modal?.type==='import'&&<div className="overlay"><div className="modal import"><button className="close" onClick={()=>setModal(null)}><X/></button><p className="eyebrow">IMPORTA</p><h2>Trasforma il tuo orario.</h2><p>Incolla una riga per lezione: <code>giorno; ora; materia; docente; aula; argomento</code></p><textarea autoFocus value={importText} onChange={e=>setImportText(e.target.value)} placeholder={'Lunedì; 08:00; Italiano; Prof.ssa Bianchi; Aula 12; Il Romanticismo\nMartedì; 10:00; Fisica; Prof. Neri; Lab. fisica'} /><button className="primary full" onClick={importSchedule}><Download size={17}/> Importa nel calendario</button></div></div>}
  {(modal?.type==='add'||modal?.type==='edit')&&<div className="overlay"><form className="modal" onSubmit={saveLesson}><button type="button" className="close" onClick={()=>setModal(null)}><X/></button><p className="eyebrow">{modal.type==='add'?'NUOVA LEZIONE':'MODIFICA LEZIONE'}</p><h2>{modal.type==='add'?'Aggiungi uno slot':'Dettagli della lezione'}</h2><div className="form-grid"><label>Materia<input name="subject" required defaultValue={modal.data.subject}/></label><label>Docente<input name="teacher" defaultValue={modal.data.teacher}/></label><label>Aula<input name="room" defaultValue={modal.data.room}/></label><label>Argomento<input name="topic" defaultValue={modal.data.topic}/></label><label>Giorno<select name="day" defaultValue={modal.data.day}>{DAYS.map((x,i)=><option value={i} key={x}>{x}</option>)}</select></label><label>Ora<select name="slot" defaultValue={modal.data.slot}>{TIMES.map((x,i)=><option value={i} key={x}>{x}</option>)}</select></label></div><button className="primary full">Salva lezione</button></form></div>}
 </main>
}
createRoot(document.getElementById('root')).render(<App/>);
